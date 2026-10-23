import { eq, sql } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { getCourseIndex } from "@/lib/content/load";
import { importCatalog } from "./catalog";
import { connect, connectPglite, migrate, type Db } from "./client";
import { addChild, createHousehold, getHousehold, setElective } from "./households";
import { attendanceDays, calendarBreaks, children, courses, enrollments, gates, holidayTeach, printedDocs } from "./schema";

let db: Db;

beforeAll(async () => {
  // In-memory PGlite by default; set TEST_DATABASE_URL to run against a real Postgres.
  const url = process.env.TEST_DATABASE_URL;
  db = url ? await connect(url) : await connectPglite();
  await migrate(db);
  await importCatalog(db);
}, 30_000);

describe("course catalog", () => {
  it("imports every Grade 3 course, and re-imports without duplicating", async () => {
    const before = await db.select().from(courses).where(eq(courses.grade, 3));
    expect(before.map((c) => c.id)).toEqual(getCourseIndex(3).map((c) => c.id));
    expect(before.filter((c) => c.elective).map((c) => c.id)).toEqual(["workshop", "hearth"]);
    await importCatalog(db);
    const after = await db.select().from(courses);
    expect(after).toHaveLength(before.length);
  });
});

describe("households and children", () => {
  it("enrolls a child in every required course of their grade, at their placement", async () => {
    const h = await createHousehold(db, { name: "The Example Family", calStart: "2026-08-10" });
    expect(h.schoolDays).toEqual([1, 2, 3, 4, 5]);
    expect(h.state).toBe("GA");

    const child = await addChild(db, h.id, { name: "Ann", grade: 3, startTerms: { latin: 2 } });
    const snap = await getHousehold(db, h.id);
    const enr = snap!.children[0].enrollments;
    expect(enr).toHaveLength(13);
    expect(enr.map((e) => e.courseId)).toEqual(getCourseIndex(3).filter((c) => !c.elective).map((c) => c.id));
    expect(enr.find((e) => e.courseId === "latin")!.pos).toBe(7);
    expect(enr.find((e) => e.courseId === "literature")!.pos).toBe(1);
    expect(child.mode).toBe("screen");
  });

  it("orders children and switches electives on and off, keeping position", async () => {
    const h = await createHousehold(db, { name: "Electives" });
    await addChild(db, h.id, { name: "First", grade: 3 });
    const second = await addChild(db, h.id, { name: "Second", grade: 3, electives: ["hearth"] });
    expect(second.sortOrder).toBe(1);

    await setElective(db, second.id, "workshop", true);
    await db
      .update(enrollments)
      .set({ pos: 5 })
      .where(sql`${enrollments.childId} = ${second.id} and ${enrollments.courseId} = 'workshop'`);
    await setElective(db, second.id, "workshop", false);
    await setElective(db, second.id, "workshop", true);

    const snap = await getHousehold(db, h.id);
    expect(snap!.children.map((c) => c.name)).toEqual(["First", "Second"]);
    const ws = snap!.children[1].enrollments.find((e) => e.courseId === "workshop")!;
    expect(ws).toMatchObject({ active: true, pos: 5 });
    expect(snap!.children[1].enrollments.find((e) => e.courseId === "hearth")!.active).toBe(true);
    expect(snap!.children[0].enrollments.some((e) => e.courseId === "hearth")).toBe(false);

    await expect(setElective(db, second.id, "latin", true)).rejects.toThrow(/not a Grade 3 elective/);
    await expect(addChild(db, h.id, { name: "X", grade: 3, electives: ["latin"] })).rejects.toThrow();
  });

  it("returns calendar settings with the household", async () => {
    const h = await createHousehold(db, { name: "Calendar" });
    await db.insert(calendarBreaks).values([
      { householdId: h.id, label: "Christmas break", from: "2026-12-21", to: "2027-01-01" },
      { householdId: h.id, label: "Thanksgiving week", from: "2026-11-23", to: "2026-11-27" },
    ]);
    await db.insert(holidayTeach).values({ householdId: h.id, date: "2026-10-12" });
    const snap = await getHousehold(db, h.id);
    expect(snap!.breaks.map((b) => b.label)).toEqual(["Thanksgiving week", "Christmas break"]);
    expect(snap!.holidayTeach).toEqual(["2026-10-12"]);
    expect(await getHousehold(db, "00000000-0000-0000-0000-000000000000")).toBeNull();
  });
});

describe("constraints", () => {
  async function child() {
    const h = await createHousehold(db, { name: "Constraints" });
    return { h, c: await addChild(db, h.id, { name: "C", grade: 3 }) };
  }

  it("keeps positions within 1–37 and terms within 1–6", async () => {
    const { c } = await child();
    const where = sql`${enrollments.childId} = ${c.id} and ${enrollments.courseId} = 'latin'`;
    await db.update(enrollments).set({ pos: 37 }).where(where);
    await expect(db.update(enrollments).set({ pos: 38 }).where(where)).rejects.toThrow();
    await expect(
      db.insert(gates).values({ childId: c.id, grade: 3, courseId: "latin", term: 7, pass: true }),
    ).rejects.toThrow();
  });

  it("rejects unknown courses and malformed print keys", async () => {
    const { c } = await child();
    await expect(
      db.insert(gates).values({ childId: c.id, grade: 3, courseId: "alchemy", term: 1, pass: true }),
    ).rejects.toThrow();
    await db.insert(printedDocs).values({ childId: c.id, grade: 3, courseId: "latin", doc: "plan" });
    await db.insert(printedDocs).values({ childId: c.id, grade: 3, courseId: "latin", doc: "t2" });
    await expect(
      db.insert(printedDocs).values({ childId: c.id, grade: 3, courseId: "latin", doc: "t7" }),
    ).rejects.toThrow();
  });

  it("rejects a break that ends before it starts", async () => {
    const { h } = await child();
    await expect(
      db.insert(calendarBreaks).values({ householdId: h.id, label: "Bad", from: "2026-12-02", to: "2026-12-01" }),
    ).rejects.toThrow();
  });

  it("deletes a household's children and records with it", async () => {
    const { h, c } = await child();
    await db.insert(attendanceDays).values({ childId: c.id, date: "2026-09-01", routineMins: 210 });
    await db.execute(sql`delete from households where id = ${h.id}`);
    expect(await db.select().from(children).where(eq(children.id, c.id))).toEqual([]);
    expect(await db.select().from(attendanceDays).where(eq(attendanceDays.childId, c.id))).toEqual([]);
  });
});
