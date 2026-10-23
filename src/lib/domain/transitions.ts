import type { Week, WeekItem } from "@/lib/content/schema";
import { isGateWeek, TERMS_PER_YEAR, WEEKS_PER_TERM } from "@/lib/content/year";
import { gatePasses, gateTotal, itemKey, type GateInput, type MasteryInfo } from "./course";

/*
 * What recording work does to a child's place in a course.
 */

export type RecordResult = { pos: number; advanced: boolean };

/**
 * Mark one item of the current week done. When every item of the week is
 * done the course moves to the next week, except in a term's last week,
 * which waits for the term check.
 */
export function recordItem(week: Week, pos: number, done: Set<string>, item: Pick<WeekItem, "track" | "key">): RecordResult {
  const after = new Set(done).add(itemKey(item));
  const finished = week.items.every((i) => after.has(itemKey(i)));
  if (finished && week.week === pos && !isGateWeek(pos)) return { pos: pos + 1, advanced: true };
  return { pos, advanced: false };
}

export type GateResult = {
  gate: { score: number | null; of: number | null; pass: boolean };
  /** The course moves past the gate week either way. */
  pos: number;
  /** A miss that doesn't fold forward holds the next term for a review week. */
  reviewTerm: number | null;
  /** A miss that folds forward carries a note into the next term's first week. */
  followUp: { week: number; text: string } | null;
  /** The check-in log line, e.g. "18 of 20 · mastery". */
  result: string;
};

export function recordGate(info: MasteryInfo, term: number, pos: number, input: GateInput): GateResult {
  const pass = gatePasses(info, input);
  const total = gateTotal(info, input);
  const last = term === TERMS_PER_YEAR;
  return {
    gate: { score: info.scored ? total : null, of: info.scored ? info.of : null, pass },
    pos: pos + 1,
    reviewTerm: pass || last || info.fold ? null : term,
    followUp:
      !pass && info.fold && !last ? { week: term * WEEKS_PER_TERM + 1, text: `From the Term ${term} check: ${info.below}` } : null,
    result: info.scored ? `${total} of ${info.of}${pass ? " · mastery" : " · below mastery"}` : "Done",
  };
}

/** What the gate form says will happen when the check is recorded. */
export function gateOutcomeLine(info: MasteryInfo, term: number, pass: boolean, reviewTicked: boolean, gradeLabel: string): string {
  if (!reviewTicked) return "Tick the review first.";
  const last = term === TERMS_PER_YEAR;
  if (pass) return last ? `${gradeLabel} finished in this course.` : `The Term ${term + 1} manual unlocks.`;
  if (info.fold) {
    const below = info.below.charAt(0).toLowerCase() + info.below.slice(1);
    return `Below the standard. ${last ? "" : `Term ${term + 1} opens as usual, and `}${below}`;
  }
  return last ? "Below the standard." : "Below mastery. A review week prints next.";
}

/**
 * The highest term whose manual is open. Later terms stay locked until the
 * check before them is recorded, and a missed check holds the next term
 * until its review week is done.
 */
export function unlockedThrough(pos: number, reviewTerm: number | null): number {
  if (reviewTerm) return reviewTerm;
  return Math.ceil(Math.min(pos, 36) / WEEKS_PER_TERM);
}
