import type { DateKey } from "./dates";

export type ExtraActivity = { label: string; mins: number };
export type AttendanceDay = { date: DateKey; routineMins: number; extra: ExtraActivity[] };

export function dayMinutes(d: Pick<AttendanceDay, "routineMins" | "extra">): number {
  return d.routineMins + d.extra.reduce((a, x) => a + x.mins, 0);
}

export type AttendanceSummary = {
  /** Days logged, including days taught elsewhere before joining. */
  days: number;
  /** Average hours across days logged here, to one decimal. */
  averageHours: string;
  /** Days logged here under the daily minimum. */
  shortDays: number;
  /** Days with any time logged. */
  loggedHere: number;
};

/** Days with time logged count toward the year; prior days come from before joining. */
export function summarize(days: AttendanceDay[], minutesPerDay: number, priorDays = 0): AttendanceSummary {
  const totals = days.map(dayMinutes).filter((m) => m > 0);
  const sum = totals.reduce((a, b) => a + b, 0);
  return {
    days: totals.length + priorDays,
    averageHours: totals.length ? (sum / totals.length / 60).toFixed(1) : "0.0",
    shortDays: totals.filter((m) => m < minutesPerDay).length,
    loggedHere: totals.length,
  };
}

/** "4:30" */
export function hm(mins: number): string {
  return `${Math.floor(mins / 60)}:${String(Math.round(mins) % 60).padStart(2, "0")}`;
}

/** The quick-add list of other instruction, with the course each comes from. */
export const EXTRA_OPTIONS: (ExtraActivity & { from: string })[] = [
  { label: "Free active play", mins: 30, from: "PE" },
  { label: "Nature walk & journal", mins: 30, from: "Science · PE" },
  { label: "Extra reading", mins: 20, from: "Literature" },
  { label: "Recitation Day", mins: 30, from: "Memory Work" },
  { label: "Co-op or field trip", mins: 60, from: "" },
  { label: "Other instruction", mins: 15, from: "" },
];
