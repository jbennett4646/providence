import { describe, expect, it } from "vitest";
import { getCourse } from "@/lib/content/load";
import { masteryInfo, minutesOf, gatePasses, itemKey } from "./course";
import { progress, standing, overallStanding, type CourseRef, type Placement } from "./progress";
import { sententiaFor, SENTENTIAE } from "./sententia";
import { recordGate, recordItem, unlockedThrough, gateOutcomeLine } from "./transitions";
import { summarize, hm } from "./attendance";
import { buildCalendar, MON_FRI } from "./calendar";
import { pausesUsed, streakLength, type StreakStatus } from "./streak";

const latin = getCourse(3, "latin")!;
const history = getCourse(3, "history")!;
const virtue = getCourse(3, "virtue")!;

describe("mastery lines", () => {
  it("reads a scored line with chants", () => {
    const m = masteryInfo(latin, 1);
    expect(m).toMatchObject({ scored: true, threshold: 16, of: 20, chants: true, parts: null, fold: false });
    expect(gatePasses(m, { score: 16, chants: true })).toBe(true);
    expect(gatePasses(m, { score: 16, chants: false })).toBe(false);
    expect(gatePasses(m, { score: 15, chants: true })).toBe(false);
  });

  it("reads a check scored in parts, each with its own standard", () => {
    const m = masteryInfo(history, 1);
    expect(m.parts).toHaveLength(2);
    expect(m).toMatchObject({ of: 24, threshold: 22, fold: true });
    expect(gatePasses(m, { parts: [17, 5] })).toBe(true);
    expect(gatePasses(m, { parts: [18, 4] })).toBe(false);
  });

  it("passes an unscored check", () => {
    const m = masteryInfo(virtue, 1);
    expect(m.scored).toBe(false);
    expect(gatePasses(m, {})).toBe(true);
  });

  it("reads routine minutes", () => {
    expect(minutesOf("15 min")).toBe(15);
    expect(minutesOf("10–15 min")).toBe(13);
    expect(minutesOf("")).toBe(0);
  });
});

describe("recording work", () => {
  const week1 = latin.terms[0].weeks[0];
  const keys = week1.items.map(itemKey);

  it("advances only when the whole week is done", () => {
    const done = new Set(keys.slice(0, -1));
    const last = week1.items.at(-1)!;
    expect(recordItem(week1, 1, new Set(), week1.items[0])).toEqual({ pos: 1, advanced: false });
    expect(recordItem(week1, 1, done, last)).toEqual({ pos: 2, advanced: true });
  });

  it("holds a term's last week for the term check", () => {
    const week6 = latin.terms[0].weeks[5];
    const all = week6.items.map(itemKey);
    expect(recordItem(week6, 6, new Set(all.slice(0, -1)), week6.items.at(-1)!)).toEqual({ pos: 6, advanced: false });
  });

  it("records a passed term check and unlocks the next term", () => {
    const r = recordGate(masteryInfo(latin, 1), 1, 6, { score: 18, chants: true });
    expect(r).toMatchObject({ gate: { score: 18, of: 20, pass: true }, pos: 7, reviewTerm: null, followUp: null, result: "18 of 20 · mastery" });
    expect(unlockedThrough(r.pos, r.reviewTerm)).toBe(2);
  });

  it("holds the next term for a review week after a miss", () => {
    const r = recordGate(masteryInfo(latin, 1), 1, 6, { score: 12, chants: true });
    expect(r).toMatchObject({ pos: 7, reviewTerm: 1, result: "12 of 20 · below mastery" });
    expect(unlockedThrough(r.pos, r.reviewTerm)).toBe(1);
  });

  it("folds a miss forward when the course says so", () => {
    const r = recordGate(masteryInfo(history, 1), 1, 6, { parts: [10, 5] });
    expect(r.reviewTerm).toBeNull();
    expect(r.followUp?.week).toBe(7);
    expect(r.followUp?.text).toMatch(/^From the Term 1 check: /);
  });

  it("never holds a review after the last term", () => {
    expect(recordGate(masteryInfo(latin, 6), 6, 36, { score: 0 }).reviewTerm).toBeNull();
  });

  it("explains the outcome on the form", () => {
    const m = masteryInfo(latin, 1);
    expect(gateOutcomeLine(m, 1, true, false, "Grade 3")).toBe("Tick the review first.");
    expect(gateOutcomeLine(m, 1, true, true, "Grade 3")).toBe("The Term 2 manual unlocks.");
    expect(gateOutcomeLine(m, 6, true, true, "Grade 3")).toBe("Grade 3 finished in this course.");
    expect(gateOutcomeLine(m, 1, false, true, "Grade 3")).toBe("Below mastery. A review week prints next.");
  });
});

describe("the floor rule", () => {
  const courses: CourseRef[] = [
    { id: "latin", dash: "Latin", course: "Latin I", elective: false, scored: true },
    { id: "arithmetic", dash: "Arithmetic", course: "Arithmetic", elective: false, scored: true },
    { id: "pe", dash: "Physical Education", course: "Physical Education", elective: false, scored: false },
    { id: "hearth", dash: "Hearth", course: "Hearth", elective: true, scored: false },
  ];
  const place = (courseId: string, pos: number, grade = 3, active = true): Placement => ({ courseId, grade, pos, active, reviewTerm: null });

  it("certifies by the slowest required course, comparing weeks", () => {
    const p = progress(courses, [place("latin", 9), place("arithmetic", 30), place("pe", 29), place("hearth", 1)], []);
    expect(p.floor).toMatchObject({ grade: 3, label: "Grade 3", openCount: 3, requiredCount: 3, weeksRemaining: 28 });
    expect(p.floor!.course.courseId).toBe("latin");
    expect(p.rows.find((r) => r.courseId === "latin")!.isFloor).toBe(true);
  });

  it("excludes electives, even when they are the slowest", () => {
    const p = progress(courses, [place("latin", 20), place("arithmetic", 20), place("pe", 20), place("hearth", 1)], []);
    expect(p.floor!.course.courseId).not.toBe("hearth");
    expect(p.rows.find((r) => r.courseId === "hearth")!.isFloor).toBe(false);
  });

  it("marks courses past the grade as Ahead", () => {
    const p = progress(courses, [place("latin", 9), place("arithmetic", 37), place("pe", 12)], []);
    const arith = p.rows.find((r) => r.courseId === "arithmetic")!;
    expect(arith).toMatchObject({ grade: 4, week: 1, ahead: true, gradeLabel: "Grade 4" });
    expect(p.floor!.openCount).toBe(2);
  });

  it("finishes the grade only when every required course is past it", () => {
    const p = progress(courses, [place("latin", 37), place("arithmetic", 37), place("pe", 37)], []);
    expect(p.floor).toMatchObject({ grade: 4, completedLabel: "Grade 3" });
  });

  it("hides electives that are switched off", () => {
    const p = progress(courses, [place("latin", 9), place("hearth", 4, 3, false)], []);
    expect(p.rows.map((r) => r.courseId)).toEqual(["latin"]);
  });

  it("shows mastery and completion, not letter grades", () => {
    const gates = [{ courseId: "latin", grade: 3, term: 1, score: 18, of: 20, pass: true }];
    expect(standing(courses[0], 3, 9, gates)).toBe("Mastered · 18/20");
    expect(standing(courses[0], 3, 3, gates)).toBe("—");
    expect(standing(courses[2], 3, 29, [])).toBe("4 of 6 terms");
    expect(overallStanding(gates)).toEqual({ label: "Mastered", note: "every scored term check so far met its mastery line" });
    expect(overallStanding([]).label).toBe("—");
  });
});

describe("sententia", () => {
  it("rotates daily through the fixed list, the same for everyone", () => {
    expect(SENTENTIAE).toHaveLength(17);
    expect(sententiaFor("2026-10-21")).toEqual(sententiaFor("2026-10-21"));
    expect(sententiaFor("2026-10-21")).not.toEqual(sententiaFor("2026-10-22"));
    expect(sententiaFor("2026-10-21")).toEqual(sententiaFor("2026-11-07"));
  });
});

describe("attendance", () => {
  it("counts days, average hours and short days", () => {
    const s = summarize(
      [
        { date: "2026-08-10", routineMins: 212, extra: [{ label: "Free active play", mins: 60 }] },
        { date: "2026-08-11", routineMins: 200, extra: [] },
        { date: "2026-08-12", routineMins: 0, extra: [] },
      ],
      270,
      10,
    );
    expect(s).toEqual({ days: 12, averageHours: "3.9", shortDays: 1, loggedHere: 2 });
    expect(hm(272)).toBe("4:32");
  });
});

describe("streak", () => {
  const cal = buildCalendar({ start: "2026-08-10", schoolDays: MON_FRI, breaks: [], holidaysTaught: [], requiredDays: 180 });
  const log = new Map<string, StreakStatus>([
    ["2026-10-14", "done"],
    ["2026-10-15", "sick"],
    ["2026-10-16", "done"],
    ["2026-10-19", "done"],
    ["2026-10-20", "done"],
  ]);

  it("counts back from yesterday, pausing on sick days and skipping weekends", () => {
    expect(streakLength(log, cal, "2026-10-21", false)).toBe(4);
    expect(streakLength(log, cal, "2026-10-21", true)).toBe(5);
  });

  it("breaks on a school day with nothing recorded", () => {
    expect(streakLength(new Map([["2026-10-19", "done"]]), cal, "2026-10-21", false)).toBe(0);
  });

  it("counts pause days in the current term", () => {
    expect(pausesUsed(log, cal, "2026-10-21")).toBe(1);
  });
});
