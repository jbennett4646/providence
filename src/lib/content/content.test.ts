import { describe, expect, it } from "vitest";
import { availableGrades, getCourse, getCourseIndex, getCourses, getWeek } from "./load";
import { firstWeekOfTerm, isGateWeek, termOfWeek, WEEKS_PER_TERM } from "./year";

/**
 * Weekly items missing from the delivered content. The prototype tolerates
 * these (it lists them as missing); new gaps should fail this test.
 */
const KNOWN_GAPS = ["latin w29 C", "latin w34 C"];

describe("year arithmetic", () => {
  it("maps weeks to terms", () => {
    expect(termOfWeek(1)).toBe(1);
    expect(termOfWeek(6)).toBe(1);
    expect(termOfWeek(7)).toBe(2);
    expect(termOfWeek(36)).toBe(6);
    expect(() => termOfWeek(0)).toThrow(RangeError);
    expect(() => termOfWeek(37)).toThrow(RangeError);
  });

  it("finds term starts and gate weeks", () => {
    expect([1, 2, 3, 4, 5, 6].map(firstWeekOfTerm)).toEqual([1, 7, 13, 19, 25, 31]);
    const gates = Array.from({ length: 36 }, (_, i) => i + 1).filter(isGateWeek);
    expect(gates).toEqual([6, 12, 18, 24, 30, 36]);
  });
});

describe("course content", () => {
  it("has Grade 3 loaded", () => {
    expect(availableGrades()).toContain(3);
    expect(getCourseIndex(4)).toEqual([]);
    expect(getCourse(3, "nope")).toBeNull();
  });

  it("has 13 required courses and 2 electives in Grade 3", () => {
    const index = getCourseIndex(3);
    expect(index.filter((c) => !c.elective)).toHaveLength(13);
    expect(index.filter((c) => c.elective).map((c) => c.id)).toEqual(["workshop", "hearth"]);
  });

  for (const grade of availableGrades()) {
    for (const entry of getCourseIndex(grade)) {
      describe(`grade ${grade} · ${entry.course}`, () => {
        const course = getCourse(grade, entry.id)!;

        it("matches its index entry", () => {
          expect(course.id).toBe(entry.id);
          expect(course.course).toBe(entry.course);
          expect(course.dash).toBe(entry.dash);
          expect(course.number).toBe(entry.number);
          expect(course.grade).toBe(grade);
          expect(!!course.elective).toBe(!!entry.elective);
        });

        it("has six terms of six weeks, numbered in order", () => {
          expect(course.terms.map((t) => t.term)).toEqual([1, 2, 3, 4, 5, 6]);
          for (const t of course.terms) {
            const start = firstWeekOfTerm(t.term);
            expect(t.weeksRange).toEqual([start, start + WEEKS_PER_TERM - 1]);
            expect(t.weeks.map((w) => w.week)).toEqual(Array.from({ length: WEEKS_PER_TERM }, (_, i) => start + i));
          }
          for (let w = 1; w <= 36; w++) expect(getWeek(course, w)?.week).toBe(w);
        });

        it("has every track's items in every week", () => {
          for (const tr of course.tracks) expect(tr.items).toHaveLength(tr.perWeek);
          const gaps: string[] = [];
          for (const t of course.terms) {
            for (const w of t.weeks) {
              expect(w.items.every((i) => course.tracks.some((tr) => tr.track === i.track))).toBe(true);
              for (const tr of course.tracks) {
                const keys = w.items.filter((i) => i.track === tr.track).map((i) => i.key);
                expect(keys.every((k) => tr.items.some((i) => i.key === k)), `week ${w.week} ${tr.track}`).toBe(true);
                for (const k of tr.items.map((i) => i.key)) if (!keys.includes(k)) gaps.push(`${course.id} w${w.week} ${k}`);
              }
            }
          }
          expect(gaps).toEqual(KNOWN_GAPS.filter((g) => g.startsWith(course.id + " ")));
        });

        it("states a readable mastery line for each scored term check", () => {
          for (const t of course.terms) {
            if (t.check) {
              expect(t.check.of).toBe(t.check.parts.reduce((n, p) => n + p.of, 0));
              expect(t.check.std).toBeLessThanOrEqual(t.check.of);
            } else if (t.mastery) {
              const m = /(\d+) of (\d+)/.exec(t.mastery);
              if (m) expect(Number(m[1])).toBeLessThanOrEqual(Number(m[2]));
            }
          }
        });
      });
    }
  }
});

describe("getCourses", () => {
  it("returns every Grade 3 course in display order", () => {
    expect(getCourses(3).map((c) => c.number)).toEqual(getCourseIndex(3).map((c) => c.number));
  });
});
