import type { SchoolCalendar } from "./calendar";
import type { DateKey } from "./dates";

/*
 * The Grade 3 test readiness plan follows the school calendar, not course
 * positions: two weeks of short daily practice in school weeks 34–35, and the
 * test itself in week 36. A school week is the calendar's planned days split
 * into 36 equal weeks (five days each in a 180-day year).
 */

export const READINESS_GRADE = 3;
export const READINESS_GUIDE = "test-readiness";
export const READINESS_TEST = "grade3-cat";
/** Ten practice sessions: five days in each of weeks 34 and 35. */
export const READINESS_SESSIONS = 10;
/** "15–20 min", counted the way the manuals' routine times are. */
export const READINESS_MINUTES = 18;

/** The school week (1–36) and day within it (1–5 in a 180-day year) of a school day number. */
export function schoolWeek(dayNumber: number, requiredDays: number): { week: number; day: number } {
  const per = requiredDays / 36;
  const week = Math.max(1, Math.min(36, Math.ceil(dayNumber / per)));
  return { week, day: dayNumber - Math.round((week - 1) * per) };
}

/** The week and day a practice session (1–10) belongs to. */
export function sessionSlot(session: number): { week: 34 | 35; day: number } {
  return { week: session <= 5 ? 34 : 35, day: ((session - 1) % 5) + 1 };
}

export type ReadinessPhase =
  | { kind: "before"; week: number }
  /** Weeks 30–33: order the test (a month ahead, the guide says) and print the guide. */
  | { kind: "prepare"; week: number }
  | { kind: "practice"; week: 34 | 35; day: number }
  | { kind: "test"; week: 36 }
  | { kind: "after" };

/**
 * Where today falls. On a day off, it is the next school day that counts:
 * a Saturday in week 33 already looks ahead to Monday of week 34.
 */
export function readinessPhase(cal: SchoolCalendar, today: DateKey): ReadinessPhase {
  if (cal.dayType(today) === "after") return { kind: "after" };
  const n = cal.planned(today) ?? cal.dayCount(today) + 1;
  if (n > cal.requiredDays) return { kind: "after" };
  const { week, day } = schoolWeek(n, cal.requiredDays);
  if (week === 34 || week === 35) return { kind: "practice", week, day };
  if (week === 36) return { kind: "test", week };
  if (week >= 30) return { kind: "prepare", week };
  return { kind: "before", week };
}

/** The first practice session not yet done, or null once all ten are. */
export function nextSession(done: Iterable<number>): number | null {
  const set = new Set(done);
  for (let s = 1; s <= READINESS_SESSIONS; s++) if (!set.has(s)) return s;
  return null;
}
