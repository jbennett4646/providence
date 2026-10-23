import { describe, expect, it } from "vitest";
import { buildCalendar, MON_FRI } from "@/lib/domain/calendar";
import { addDays, type DateKey } from "@/lib/domain/dates";
import { readinessToday, readinessView } from "./readiness";
import type { Child, ChildRecords, HouseholdContext } from "./state";

const cal = buildCalendar({ start: "2026-08-10", schoolDays: MON_FRI, breaks: [], holidaysTaught: [], requiredDays: 180 });

function dateOfDay(n: number): DateKey {
  for (let k = cal.start; k <= cal.last; k = addDays(k, 1)) if (cal.planned(k) === n) return k;
  throw new Error(`no day ${n}`);
}

const ctx = (today: DateKey) => ({ today, calendar: cal }) as HouseholdContext;
const child = (grade: number) => ({ grade }) as Child;
const rec = (sessions: { session: number; doneOn: DateKey }[] = [], test?: DateKey) =>
  ({
    guideSessions: sessions.map((s) => ({ childId: "c", grade: 3, guideId: "test-readiness", ...s })),
    tests: new Map(test ? [["grade3-cat", test]] : []),
  }) as ChildRecords;

describe("test readiness on the Teaching screen", () => {
  it("is only for Grade 3, and only from week 30", () => {
    expect(readinessView(child(4), ctx(dateOfDay(166)), rec())).toBeNull();
    expect(readinessView(child(3), ctx(dateOfDay(140)), rec())).toBeNull();
    expect(readinessView(child(3), ctx(dateOfDay(150)), rec())?.phase.kind).toBe("prepare");
  });

  it("offers the next practice session, in order", () => {
    const today = dateOfDay(168);
    const v = readinessView(child(3), ctx(today), rec([{ session: 1, doneOn: dateOfDay(166) }]))!;
    expect(v.phase).toEqual({ kind: "practice", week: 34, day: 3 });
    expect(v.next).toMatchObject({ session: 2, week: 34, day: 2, title: "Reading passages" });
    expect(v.next?.text).toMatch(/Sample passage 1/);
    expect(v.done).toBe(1);
    expect(v.doneToday).toEqual([]);
  });

  it("counts 15–20 minutes on paper during the practice weeks only", () => {
    expect(readinessToday(child(3), ctx(dateOfDay(170))).practiceMins).toBe(18);
    expect(readinessToday(child(3), ctx(dateOfDay(176))).practiceMins).toBe(0);
    expect(readinessToday(child(2), ctx(dateOfDay(170))).practiceMins).toBe(0);
  });

  it("shows the test week with the guide's notes and the recorded date", () => {
    const v = readinessView(child(3), ctx(dateOfDay(178)), rec([], "2027-05-18"))!;
    expect(v.phase.kind).toBe("test");
    expect(v.testDate).toBe("2027-05-18");
    expect(v.notes.some((n) => /Keep the score report/.test(n))).toBe(true);
    expect(v.tellChild).toMatch(/check-up/);
  });
});
