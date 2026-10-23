import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { importCatalog } from "@/db/catalog";
import { connectPglite, migrate, type Db } from "@/db/client";
import { addChild, createHousehold, getHousehold } from "@/db/households";
import { children, enrollments, filings, gates, households, reportNotes } from "@/db/schema";
import { householdContext } from "../state";
import { declarationModel, declarationStatus, reportModel, DECLARATION } from "./model";
import { DeclarationDoc, renderPdf, ReportDoc } from "./pdf";

let db: Db;
vi.mock("@/db/client", async (orig) => ({ ...(await orig<typeof import("@/db/client")>()), getDb: async () => db }));

beforeAll(async () => {
  db = await connectPglite();
  await migrate(db);
  await importCatalog(db);
}, 30_000);

async function family() {
  const h = await createHousehold(db, { name: "The Hartwell Family", calStart: "2026-08-10" });
  const c = await addChild(db, h.id, { name: "Thomas", grade: 3 });
  return { h, c };
}

const NOW = new Date("2026-10-21T15:00:00Z");

describe("Declaration of Intent", () => {
  it("lists what's missing, then fills in from the household", async () => {
    const { h, c } = await family();
    let snap = (await getHousehold(db, h.id))!;
    let m = await declarationModel(snap, householdContext(snap, NOW));
    expect(m.missing).toEqual(["the instructing parent’s name", "the address where home study takes place", "your county", "Thomas’s date of birth"]);

    await db
      .update(households)
      .set({ parentName: "Anne Hartwell", addressLine1: "12 Oak Lane", city: "Athens", county: "Clarke", postalCode: "30601" })
      .where(eq(households.id, h.id));
    await db.update(children).set({ birthDate: "2017-05-01" }).where(eq(children.id, c.id));
    snap = (await getHousehold(db, h.id))!;
    m = await declarationModel(snap, householdContext(snap, NOW));
    expect(m.missing).toEqual([]);
    expect(m.address).toEqual(["12 Oak Lane", "Athens, GA 30601"]);
    expect(m.students).toEqual([{ name: "Thomas", age: 9, birthDate: "2017-05-01", grade: "Grade 3" }]);
    expect(m.period).toEqual({ from: "Mon 10 Aug 2026", to: "Mon 9 Aug 2027" });

    const pdf = await renderPdf(<DeclarationDoc m={m} />);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(10_000);
  }, 30_000);

  it("is due 30 days after starting the first year, and records the filing", async () => {
    const { h } = await family();
    let snap = (await getHousehold(db, h.id))!;
    const ctx = householdContext(snap, NOW);
    expect(await declarationStatus(snap, ctx)).toMatchObject({ filed: null, due: "2026-09-09" });
    await db.insert(filings).values({ householdId: h.id, form: DECLARATION, schoolYear: "2025-08-11", filedOn: "2025-08-20" });
    snap = (await getHousehold(db, h.id))!;
    expect((await declarationStatus(snap, ctx)).due).toBe("2026-09-01");
    await db.insert(filings).values({ householdId: h.id, form: DECLARATION, schoolYear: "2026-08-10", filedOn: "2026-08-28" });
    expect((await declarationStatus(snap, ctx)).filed?.filedOn).toBe("2026-08-28");
  });
});

describe("annual progress report", () => {
  it("fills the five subjects from the record, with the parent's notes", async () => {
    const { h, c } = await family();
    await db.update(enrollments).set({ pos: 9 }).where(eq(enrollments.childId, c.id));
    await db.insert(gates).values({ childId: c.id, grade: 3, courseId: "arithmetic", term: 1, score: 18, of: 20, pass: true });
    await db.insert(reportNotes).values({ childId: c.id, schoolYear: "2026-08-10", subject: "Mathematics", note: "Addition facts are secure; long division started." });
    const snap = (await getHousehold(db, h.id))!;
    const m = await reportModel(snap, snap.children[0]);
    expect(m.subjects.map((s) => s.name)).toEqual(["Reading", "Language Arts", "Mathematics", "Social Studies", "Science"]);
    const math = m.subjects.find((s) => s.name === "Mathematics")!;
    expect(math.note).toMatch(/long division/);
    expect(math.courses[0]).toMatchObject({ name: "Arithmetic", position: "Term 2 · Week 9 of 36", progress: "8 of 36 weeks completed", standing: "Mastered" });
    expect(math.courses[0].checks).toEqual(["Term 1: 18 of 20, met the mastery line"]);
    expect(m.subjects.find((s) => s.name === "Language Arts")!.courses.map((x) => x.name)).toEqual(["Grammar & Composition", "Spelling & Vocabulary", "Penmanship"]);
    expect(m.beyond.map((x) => x.name)).toEqual(["Bible & Christian Studies", "Latin I", "Fine Arts", "Physical Education", "Virtue Formation"]);
    expect(m.georgia).toBe(true);

    const pdf = await renderPdf(<ReportDoc m={m} />);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  }, 30_000);
});
