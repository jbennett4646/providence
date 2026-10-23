import { and, eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { importCatalog } from "@/db/catalog";
import { connect, connectPglite, migrate, type Db } from "@/db/client";
import { addChild, createHousehold } from "@/db/households";
import { attendanceDays, checkins, enrollments, gates, itemRecords, streakDays, teachingEntries } from "@/db/schema";
import { getCourse, getWeek } from "@/lib/content/load";
import * as m from "./mutations";

let db: Db;

beforeAll(async () => {
  const url = process.env.TEST_DATABASE_URL;
  db = url ? await connect(url) : await connectPglite();
  await migrate(db);
  await importCatalog(db);
}, 30_000);

const latin = getCourse(3, "latin")!;
const DAY = "2026-10-21";

async function setup(startTerms?: Record<string, number>) {
  const h = await createHousehold(db, { name: "Test", calStart: "2026-08-10" });
  const c = await addChild(db, h.id, { name: "T", grade: 3, startTerms });
  return { h, child: { id: c.id, grade: 3, mode: "screen" as const } };
}

async function pos(childId: string, courseId = "latin") {
  const [e] = await db.select().from(enrollments).where(and(eq(enrollments.childId, childId), eq(enrollments.courseId, courseId)));
  return e;
}

async function doWeek(child: { id: string; grade: number; mode: "screen" }, week: number, day = DAY) {
  for (const it of getWeek(latin, week)!.items) {
    await m.recordItem(db, child, day, { grade: 3, courseId: "latin", week, track: it.track, key: it.key, outcome: "well" });
  }
}

describe("recording lessons", () => {
  it("advances a course when its week is done, and logs it", async () => {
    const { child } = await setup();
    await doWeek(child, 1);
    expect((await pos(child.id)).pos).toBe(2);
    const log = await db.select().from(checkins).where(eq(checkins.childId, child.id));
    expect(log.map((l) => [l.label, l.result])).toEqual([["Latin I · Week 1", "Finished"]]);
  });

  it("ignores a stale page for a week the course has left", async () => {
    const { child } = await setup();
    await doWeek(child, 1);
    await m.recordItem(db, child, DAY, { grade: 3, courseId: "latin", week: 1, track: "daily", key: "1", outcome: "well" });
    expect((await pos(child.id)).pos).toBe(2);
  });

  it("files routine minutes to the day's attendance", async () => {
    const { child } = await setup();
    await m.recordItem(db, child, DAY, { grade: 3, courseId: "latin", week: 1, track: "daily", key: "1", outcome: "well" });
    const [a] = await db.select().from(attendanceDays).where(eq(attendanceDays.childId, child.id));
    expect(a.routineMins).toBeGreaterThan(0);
  });

  it("undoes the last entry, including a finished week", async () => {
    const { child } = await setup();
    await doWeek(child, 1);
    await m.undoEntry(db, child, DAY, "latin", "q");
    expect((await pos(child.id)).pos).toBe(1);
    const log = await db.select().from(checkins).where(eq(checkins.childId, child.id));
    expect(log).toEqual([]);
    const recs = await db.select().from(itemRecords).where(eq(itemRecords.childId, child.id));
    expect(recs).toHaveLength(8);
    const entries = await db.select().from(teachingEntries).where(eq(teachingEntries.childId, child.id));
    expect(entries.map((e) => e.lane)).toEqual(["d"]);
  });

  it("keeps an item first in line when it needs another day", async () => {
    const { child } = await setup();
    await m.recordItem(db, child, DAY, { grade: 3, courseId: "latin", week: 1, track: "daily", key: "1", outcome: "again" });
    expect(await db.select().from(itemRecords).where(eq(itemRecords.childId, child.id))).toEqual([]);
    const [te] = await db.select().from(teachingEntries).where(eq(teachingEntries.childId, child.id));
    expect(te).toMatchObject({ outcome: "again", advanced: false });
  });

  it("counts the day toward the streak once every daily course is recorded", async () => {
    const { child } = await setup();
    const daily = ["bible", "memory", "arithmetic", "spelling", "penmanship", "latin"];
    for (const id of daily) {
      const c = getCourse(3, id)!;
      const it = getWeek(c, 1)!.items.find((i) => i.track === "daily")!;
      await m.recordItem(db, child, DAY, { grade: 3, courseId: id, week: 1, track: "daily", key: it.key, outcome: "well" });
    }
    const [s] = await db.select().from(streakDays).where(eq(streakDays.childId, child.id));
    expect(s?.status).toBe("done");
    await m.undoEntry(db, child, DAY, "latin", "d");
    expect(await db.select().from(streakDays).where(eq(streakDays.childId, child.id))).toEqual([]);
  });
});

describe("term checks", () => {
  it("holds week 6 for the term check, then unlocks Term 2 on a pass", async () => {
    const { child } = await setup();
    await db.update(enrollments).set({ pos: 6 }).where(and(eq(enrollments.childId, child.id), eq(enrollments.courseId, "latin")));
    await doWeek(child, 6);
    expect((await pos(child.id)).pos).toBe(6);
    await m.recordTermCheck(db, child.id, 3, "latin", 1, { score: 18, chants: true });
    expect(await pos(child.id)).toMatchObject({ pos: 7, reviewTerm: null });
    const [g] = await db.select().from(gates).where(eq(gates.childId, child.id));
    expect(g).toMatchObject({ term: 1, score: 18, of: 20, pass: true });
  });

  it("sets a review week after a miss, and clears it when done", async () => {
    const { child } = await setup();
    await db.update(enrollments).set({ pos: 6 }).where(and(eq(enrollments.childId, child.id), eq(enrollments.courseId, "latin")));
    await m.recordTermCheck(db, child.id, 3, "latin", 1, { score: 10, chants: true });
    expect(await pos(child.id)).toMatchObject({ pos: 7, reviewTerm: 1 });
    // Lessons can't be recorded during the review week.
    await m.recordItem(db, child, DAY, { grade: 3, courseId: "latin", week: 7, track: "daily", key: "1", outcome: "well" });
    expect(await db.select().from(itemRecords).where(eq(itemRecords.childId, child.id))).toEqual([]);
    await m.reviewWeekDone(db, child.id, 3, "latin");
    expect((await pos(child.id)).reviewTerm).toBeNull();
  });

  it("refuses a term check outside a gate week", async () => {
    const { child } = await setup();
    await m.recordTermCheck(db, child.id, 3, "latin", 1, { score: 20, chants: true });
    expect((await pos(child.id)).pos).toBe(1);
  });

  it("finishes the grade after the Term 6 check", async () => {
    const { child } = await setup();
    await db.update(enrollments).set({ pos: 36 }).where(and(eq(enrollments.childId, child.id), eq(enrollments.courseId, "latin")));
    await m.recordTermCheck(db, child.id, 3, "latin", 6, { score: 20 });
    expect((await pos(child.id)).pos).toBe(37);
  });
});

describe("paper mode", () => {
  it("moves on with Week done and logs Carry over without moving", async () => {
    const { child } = await setup();
    await m.carryOver(db, child.id, 3, "latin");
    await m.paperWeekDone(db, child.id, 3, "latin", 1);
    await m.paperWeekDone(db, child.id, 3, "latin", 1); // a second tap on a stale page does nothing
    expect((await pos(child.id)).pos).toBe(2);
    const log = await db.select().from(checkins).where(eq(checkins.childId, child.id));
    expect(log.map((l) => l.result).sort()).toEqual(["Carried over", "Done"]);
  });

  it("counts a usual day's routine when done from the booklets", async () => {
    const { child } = await setup();
    const paper = { ...child, mode: "paper" as const };
    await m.togglePaperRoutine(db, paper, DAY);
    const [a] = await db.select().from(attendanceDays).where(eq(attendanceDays.childId, child.id));
    expect(a.paperRoutine).toBe(true);
    expect(a.routineMins).toBeGreaterThan(120);
    await m.togglePaperRoutine(db, paper, DAY);
    const [b] = await db.select().from(attendanceDays).where(eq(attendanceDays.childId, child.id));
    expect(b).toMatchObject({ paperRoutine: false, routineMins: 0 });
  });
});
