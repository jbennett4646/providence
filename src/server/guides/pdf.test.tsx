import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getGuide } from "@/lib/content/guide";
import { renderPdf } from "../forms/pdf";
import { GuideDoc } from "./pdf";

describe("guide PDF", () => {
  it("renders the Grade 3 test readiness guide as a Letter booklet", async () => {
    const pdf = await renderPdf(<GuideDoc guide={getGuide(3, "test-readiness")!} forLine="Grade 3 · for the parent" />);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    // Letter is 612 × 792 points.
    expect(pdf.toString("latin1")).toMatch(/MediaBox \[0 0 612 792\]/);
    if (process.env.GUIDE_PDF_OUT) writeFileSync(process.env.GUIDE_PDF_OUT, pdf);
  }, 60_000);
});
