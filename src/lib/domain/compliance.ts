/*
 * Per-state home-study requirements. Compliance tooling covers Georgia for
 * now; other states enroll but get no state-specific checks or forms yet.
 */

export type RequiredSubject = { name: string; courses: string[] };

export type StateRules = {
  code: string;
  name: string;
  /** Statute the rules come from, for display. */
  citation: string;
  requiredDays: number;
  minutesPerDay: number;
  subjects: RequiredSubject[];
  forms: { id: string; name: string; due: string }[];
};

export const GEORGIA: StateRules = {
  code: "GA",
  name: "Georgia",
  citation: "O.C.G.A. § 20-2-690",
  requiredDays: 180,
  minutesPerDay: 270,
  subjects: [
    { name: "Reading", courses: ["literature", "memory"] },
    { name: "Language Arts", courses: ["grammar", "spelling", "penmanship"] },
    { name: "Mathematics", courses: ["arithmetic"] },
    { name: "Social Studies", courses: ["history"] },
    { name: "Science", courses: ["science"] },
  ],
  forms: [
    { id: "declaration", name: "Declaration of Intent", due: "Within 30 days of starting, then by September 1 each year" },
    { id: "annual-report", name: "Annual progress report", due: "Each year; the family keeps it" },
  ],
};

const STATES: Record<string, StateRules> = { GA: GEORGIA };

/** The state's rules, or null where compliance tooling isn't built yet. */
export function stateRules(code: string): StateRules | null {
  return STATES[code.toUpperCase()] ?? null;
}

/** Calendar defaults used when a state has no rules of its own (the Georgia figures). */
export const DEFAULT_REQUIRED_DAYS = GEORGIA.requiredDays;
export const DEFAULT_MINUTES_PER_DAY = GEORGIA.minutesPerDay;
