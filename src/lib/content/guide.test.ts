import { describe, expect, it } from "vitest";
import { getGuide, readinessPlan } from "./guide";

describe("Grade 3 test readiness guide", () => {
  const g = getGuide(3, "test-readiness")!;

  it("loads and validates", () => {
    expect(g.title).toBe("Grade 3 Test Readiness");
    expect(g.subtitle).toMatch(/^Providence Home Academy · /);
    expect(getGuide(3, "nope")).toBeNull();
    expect(getGuide(3, "../x")).toBeNull();
  });

  it("names the academy correctly throughout", () => {
    expect(JSON.stringify(g)).not.toMatch(/Providence Academy/);
  });

  it("has 40 numbered questions, each with four choices, and a key for every one", () => {
    const qs = g.sections.flatMap((s) => s.blocks.flatMap((b) => (b.kind === "group" ? b.questions : [])));
    expect(qs.map((q) => q.n)).toEqual(Array.from({ length: 40 }, (_, i) => i + 1));
    const key = g.sections.flatMap((s) => s.blocks).find((b) => b.kind === "key");
    expect(key?.kind === "key" && Object.keys(key.answers).length).toBe(40);
    const sheet = g.sections.flatMap((s) => s.blocks).find((b) => b.kind === "answersheet");
    expect(sheet?.kind === "answersheet" && sheet.count).toBe(40);
  });

  it("plans five days in each of weeks 34 and 35", () => {
    const plan = readinessPlan(g);
    expect(plan.map((d) => d.day)).toEqual([1, 2, 3, 4, 5]);
    expect(plan[0].week34.title).toBe("The answer sheet");
    expect(plan[4].week35.title).toBe("A full practice round");
  });
});
