import { describe, expect, it } from "vitest";
import { buildCalendar, MON_FRI, MON_SAT } from "./calendar";
import { addDays, type DateKey } from "./dates";
import { nextSession, readinessPhase, schoolWeek, sessionSlot } from "./readiness";

const BREAKS = [
  { id: "tg", label: "Thanksgiving week", from: "2026-11-23", to: "2026-11-27" },
  { id: "xm", label: "Christmas break", from: "2026-12-21", to: "2027-01-01" },
  { id: "sp", label: "Spring break", from: "2027-03-15", to: "2027-03-19" },
];

function dateOfDay(cal: ReturnType<typeof buildCalendar>, n: number): DateKey {
  for (let k = cal.start; k <= cal.last; k = addDays(k, 1)) if (cal.planned(k) === n) return k;
  throw new Error(`no school day ${n}`);
}

describe("school weeks", () => {
  it("splits a 180-day year into 36 weeks of five days", () => {
    expect(schoolWeek(1, 180)).toEqual({ week: 1, day: 1 });
    expect(schoolWeek(5, 180)).toEqual({ week: 1, day: 5 });
    expect(schoolWeek(6, 180)).toEqual({ week: 2, day: 1 });
    expect(schoolWeek(166, 180)).toEqual({ week: 34, day: 1 });
    expect(schoolWeek(175, 180)).toEqual({ week: 35, day: 5 });
    expect(schoolWeek(180, 180)).toEqual({ week: 36, day: 5 });
  });

  it("maps the ten practice sessions onto weeks 34 and 35", () => {
    expect(sessionSlot(1)).toEqual({ week: 34, day: 1 });
    expect(sessionSlot(5)).toEqual({ week: 34, day: 5 });
    expect(sessionSlot(6)).toEqual({ week: 35, day: 1 });
    expect(sessionSlot(10)).toEqual({ week: 35, day: 5 });
  });

  it("picks the first session not yet done", () => {
    expect(nextSession([])).toBe(1);
    expect(nextSession([1, 2, 4])).toBe(3);
    expect(nextSession([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])).toBeNull();
  });
});

describe("readiness phase on the school calendar", () => {
  const cal = buildCalendar({ start: "2026-08-10", schoolDays: MON_FRI, breaks: BREAKS, holidaysTaught: [], requiredDays: 180 });

  it("follows the calendar's planned days, around breaks", () => {
    expect(readinessPhase(cal, "2026-08-10")).toEqual({ kind: "before", week: 1 });
    expect(readinessPhase(cal, dateOfDay(cal, 145))).toEqual({ kind: "before", week: 29 });
    expect(readinessPhase(cal, dateOfDay(cal, 146))).toEqual({ kind: "prepare", week: 30 });
    expect(readinessPhase(cal, dateOfDay(cal, 161))).toEqual({ kind: "prepare", week: 33 });
    expect(readinessPhase(cal, dateOfDay(cal, 166))).toEqual({ kind: "practice", week: 34, day: 1 });
    expect(readinessPhase(cal, dateOfDay(cal, 173))).toEqual({ kind: "practice", week: 35, day: 3 });
    expect(readinessPhase(cal, dateOfDay(cal, 176))).toEqual({ kind: "test", week: 36 });
    expect(readinessPhase(cal, cal.last)).toEqual({ kind: "test", week: 36 });
    expect(readinessPhase(cal, addDays(cal.last, 3))).toEqual({ kind: "after" });
  });

  it("looks ahead to the next school day on a day off", () => {
    // The weekend after day 165 (the last day of week 33) belongs to week 34.
    const fri = dateOfDay(cal, 165);
    expect(readinessPhase(cal, fri)).toEqual({ kind: "prepare", week: 33 });
    expect(readinessPhase(cal, addDays(fri, 1))).toEqual({ kind: "practice", week: 34, day: 1 });
  });

  it("works the same on a six-day week", () => {
    const six = buildCalendar({ start: "2026-08-10", schoolDays: MON_SAT, breaks: [], holidaysTaught: [], requiredDays: 180 });
    expect(readinessPhase(six, dateOfDay(six, 170))).toEqual({ kind: "practice", week: 34, day: 5 });
  });
});
