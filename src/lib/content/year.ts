/** A school year is 36 weeks: 6 terms of 6 weeks. */
export const WEEKS_PER_TERM = 6;
export const TERMS_PER_YEAR = 6;
export const WEEKS_PER_YEAR = WEEKS_PER_TERM * TERMS_PER_YEAR;

/** A course position past the last week: the grade is finished in that course. */
export const FINISHED_POS = WEEKS_PER_YEAR + 1;

/** The term (1–6) a week (1–36) falls in. */
export function termOfWeek(week: number): number {
  if (!Number.isInteger(week) || week < 1 || week > WEEKS_PER_YEAR) {
    throw new RangeError(`week must be an integer from 1 to ${WEEKS_PER_YEAR}, got ${week}`);
  }
  return Math.ceil(week / WEEKS_PER_TERM);
}

/** The first week of a term: 1, 7, 13, 19, 25, 31. */
export function firstWeekOfTerm(term: number): number {
  if (!Number.isInteger(term) || term < 1 || term > TERMS_PER_YEAR) {
    throw new RangeError(`term must be an integer from 1 to ${TERMS_PER_YEAR}, got ${term}`);
  }
  return (term - 1) * WEEKS_PER_TERM + 1;
}

/** The last week of each term carries the term check (weeks 6, 12, … 36). */
export function isGateWeek(week: number): boolean {
  return termOfWeek(week) * WEEKS_PER_TERM === week;
}
