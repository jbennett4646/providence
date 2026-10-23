import { addDays, keyOf, toDate, yearOf, type DateKey } from "./dates";

/*
 * Rules for the state forms. Georgia (O.C.G.A. § 20-2-690): a Declaration of
 * Intent within 30 days of starting home study, then by September 1 each
 * year, listing each student's name and age, the address where the home
 * study program is located, and the 12-month period that is its school year.
 * An annual progress report in each required subject is written by the
 * parent and kept (not filed).
 */

/** Whole years of age on a date. */
export function ageOn(birth: DateKey, on: DateKey): number {
  const b = toDate(birth);
  const d = toDate(on);
  let age = d.getUTCFullYear() - b.getUTCFullYear();
  if (d.getUTCMonth() < b.getUTCMonth() || (d.getUTCMonth() === b.getUTCMonth() && d.getUTCDate() < b.getUTCDate())) age--;
  return age;
}

/** The 12-month school year starting on the first day of school. */
export function schoolYearPeriod(start: DateKey): { from: DateKey; to: DateKey } {
  const d = toDate(start);
  const next = keyOf(d.getUTCFullYear() + 1, d.getUTCMonth(), d.getUTCDate());
  return { from: start, to: addDays(next, -1) };
}

/** "2026–27" */
export function schoolYearLabel(start: DateKey): string {
  return `${yearOf(start)}–${String(yearOf(start) + 1).slice(2)}`;
}

/**
 * When the year's Declaration of Intent is due: within 30 days of starting
 * home study the first year, then by September 1 of each school year (or 30
 * days after the first day, if school starts later).
 */
export function declarationDue(start: DateKey, firstYear: boolean): DateKey {
  const thirty = addDays(start, 30);
  if (firstYear) return thirty;
  const sept1 = keyOf(yearOf(start), 8, 1);
  return sept1 >= start ? sept1 : thirty;
}

export type DeclarationInput = {
  parentName: string | null;
  addressLine1: string | null;
  city: string | null;
  county: string | null;
  postalCode: string | null;
  children: { name: string; birthDate: string | null }[];
};

/** What the Declaration of Intent still needs before it can be printed. */
export function declarationMissing(d: DeclarationInput): string[] {
  const missing: string[] = [];
  if (!d.parentName?.trim()) missing.push("the instructing parent’s name");
  if (!d.addressLine1?.trim() || !d.city?.trim() || !d.postalCode?.trim()) missing.push("the address where home study takes place");
  if (!d.county?.trim()) missing.push("your county");
  if (!d.children.length) missing.push("at least one child");
  for (const c of d.children) if (!c.birthDate) missing.push(`${c.name}’s date of birth`);
  return missing;
}
