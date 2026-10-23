import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { getCourse, getWeek } from "@/lib/content/load";
import { isGateWeek, termOfWeek } from "@/lib/content/year";
import { defaultBreaks, MON_FRI, MON_SAT } from "@/lib/domain/calendar";
import { masteryInfo, minutesOf, routineItem, usualDayMinutes, type GateInput } from "@/lib/domain/course";
import { isDateKey, type DateKey } from "@/lib/domain/dates";
import { READINESS_GRADE, READINESS_GUIDE, READINESS_MINUTES, sessionSlot } from "@/lib/domain/readiness";
import { recordGate as gateTransition, recordItem as itemTransition } from "@/lib/domain/transitions";
import type { Db } from "@/db/client";
import {
  attendanceDays,
  calendarBreaks,
  checkins,
  children,
  enrollments,
  gates,
  guideSessions,
  holidayTeach,
  households,
  itemRecords,
  printedDocs,
  streakDays,
  teachingEntries,
  testRecords,
  type ExtraActivity,
} from "@/db/schema";

/*
 * Every change a parent makes, as database operations. Callers (the server
 * actions) have already checked the child belongs to the household.
 */

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type Conn = Db | Tx;

type ChildRef = { id: string; grade: number; mode: "screen" | "paper" };

async function enrollment(db: Conn, childId: string, grade: number, courseId: string) {
  const [e] = await db
    .select()
    .from(enrollments)
    .where(and(eq(enrollments.childId, childId), eq(enrollments.grade, grade), eq(enrollments.courseId, courseId)));
  return e ?? null;
}

async function logCheckin(db: Conn, childId: string, grade: number, courseId: string, label: string, result: string) {
  await db.insert(checkins).values({ childId, grade, courseId, label, result });
}

function courseOrThrow(grade: number, courseId: string) {
  const c = getCourse(grade, courseId);
  if (!c) throw new Error(`No Grade ${grade} course ${courseId}`);
  return c;
}

// ---------------------------------------------------------------------------
// Teaching on screen

export type RecordInput = {
  grade: number;
  courseId: string;
  week: number;
  track: "daily" | "queue" | "weekly";
  key: string;
  outcome: "well" | "again";
};

/** Record one lesson item as done ("well") or needing another day ("again"). */
export async function recordItem(db: Db, child: ChildRef, today: DateKey, input: RecordInput) {
  await db.transaction(async (tx) => {
    const e = await enrollment(tx, child.id, input.grade, input.courseId);
    // A stale page (the course has moved on) records nothing.
    if (!e || e.pos !== input.week || e.reviewTerm) return;
    const course = courseOrThrow(input.grade, input.courseId);
    const week = getWeek(course, input.week);
    const item = week?.items.find((i) => i.track === input.track && i.key === input.key);
    if (!week || !item) throw new Error("No such item");

    let pos = e.pos;
    let advanced = false;
    if (input.outcome === "well") {
      const done = await tx
        .select({ track: itemRecords.track, key: itemRecords.itemKey })
        .from(itemRecords)
        .where(
          and(
            eq(itemRecords.childId, child.id),
            eq(itemRecords.grade, input.grade),
            eq(itemRecords.courseId, input.courseId),
            eq(itemRecords.week, input.week),
          ),
        );
      await tx
        .insert(itemRecords)
        .values({ childId: child.id, grade: input.grade, courseId: input.courseId, week: input.week, track: item.track, itemKey: item.key, doneOn: today })
        .onConflictDoNothing();
      const r = itemTransition(week, e.pos, new Set(done.map((d) => d.track[0] + d.key)), item);
      ({ pos, advanced } = r);
      if (advanced) {
        await tx
          .update(enrollments)
          .set({ pos })
          .where(and(eq(enrollments.childId, child.id), eq(enrollments.grade, input.grade), eq(enrollments.courseId, input.courseId)));
        await logCheckin(tx, child.id, input.grade, input.courseId, `${course.course} · Week ${input.week}`, "Finished");
      }
    }
    const lane = item.track === "daily" ? "d" : "q";
    const entry = {
      grade: input.grade,
      week: input.week,
      track: item.track,
      itemKey: item.key,
      outcome: input.outcome,
      prevPos: e.pos,
      advanced,
      cleared: false,
    };
    await tx
      .insert(teachingEntries)
      .values({ childId: child.id, date: today, courseId: input.courseId, lane, ...entry })
      .onConflictDoUpdate({ target: [teachingEntries.childId, teachingEntries.date, teachingEntries.courseId, teachingEntries.lane], set: entry });
    await syncDay(tx, child, today);
  });
}

/** Undo today's last entry on a card, if the course hasn't moved since. */
export async function undoEntry(db: Db, child: ChildRef, today: DateKey, courseId: string, lane: "d" | "q") {
  await db.transaction(async (tx) => {
    const where = and(
      eq(teachingEntries.childId, child.id),
      eq(teachingEntries.date, today),
      eq(teachingEntries.courseId, courseId),
      eq(teachingEntries.lane, lane),
    );
    const [te] = await tx.select().from(teachingEntries).where(where);
    if (!te) return;
    const e = await enrollment(tx, child.id, te.grade, courseId);
    if (!e || e.pos !== (te.advanced ? te.prevPos + 1 : te.prevPos)) return;
    if (te.outcome === "well") {
      await tx
        .delete(itemRecords)
        .where(
          and(
            eq(itemRecords.childId, child.id),
            eq(itemRecords.grade, te.grade),
            eq(itemRecords.courseId, courseId),
            eq(itemRecords.week, te.week),
            eq(itemRecords.track, te.track),
            eq(itemRecords.itemKey, te.itemKey),
          ),
        );
    }
    if (te.advanced) {
      await tx
        .update(enrollments)
        .set({ pos: te.prevPos })
        .where(and(eq(enrollments.childId, child.id), eq(enrollments.grade, te.grade), eq(enrollments.courseId, courseId)));
      const course = courseOrThrow(te.grade, courseId);
      const [last] = await tx
        .select({ id: checkins.id })
        .from(checkins)
        .where(and(eq(checkins.childId, child.id), eq(checkins.label, `${course.course} · Week ${te.week}`), eq(checkins.result, "Finished")))
        .orderBy(desc(checkins.createdAt))
        .limit(1);
      if (last) await tx.delete(checkins).where(eq(checkins.id, last.id));
    }
    await tx.delete(teachingEntries).where(where);
    await syncDay(tx, child, today);
  });
}

/** Move on from a recorded card to the next item ("Keep going"). */
export async function clearEntry(db: Db, childId: string, today: DateKey, courseId: string, lane: "d" | "q") {
  await db
    .update(teachingEntries)
    .set({ cleared: true })
    .where(
      and(
        eq(teachingEntries.childId, childId),
        eq(teachingEntries.date, today),
        eq(teachingEntries.courseId, courseId),
        eq(teachingEntries.lane, lane),
      ),
    );
}

/** Active Grade-level courses with content, for the child. */
async function liveEnrollments(db: Conn, childId: string) {
  const rows = await db.select().from(enrollments).where(and(eq(enrollments.childId, childId), eq(enrollments.active, true)));
  return rows.filter((e) => getCourse(e.grade, e.courseId));
}

/**
 * Bring today's attendance and streak in line with what's recorded: the
 * routine minutes are the routine times of the items (and guide practice
 * sessions) done today, and the
 * day counts toward the streak once every daily course has its daily core
 * recorded (or has nothing left this week).
 */
async function syncDay(db: Conn, child: ChildRef, today: DateKey) {
  if (child.mode === "screen") {
    const doneToday = await db
      .select()
      .from(itemRecords)
      .where(and(eq(itemRecords.childId, child.id), eq(itemRecords.doneOn, today)));
    const routine = doneToday.reduce((a, r) => {
      const c = getCourse(r.grade, r.courseId);
      return a + (c ? minutesOf(routineItem(c, { track: r.track, key: r.itemKey })?.time) : 0);
    }, 0);
    const practice = await db
      .select()
      .from(guideSessions)
      .where(and(eq(guideSessions.childId, child.id), eq(guideSessions.doneOn, today)));
    const mins = routine + practice.length * READINESS_MINUTES;
    await db
      .insert(attendanceDays)
      .values({ childId: child.id, date: today, routineMins: mins })
      .onConflictDoUpdate({ target: [attendanceDays.childId, attendanceDays.date], set: { routineMins: mins } });
  }

  const live = await liveEnrollments(db, child.id);
  const entries = await db
    .select()
    .from(teachingEntries)
    .where(and(eq(teachingEntries.childId, child.id), eq(teachingEntries.date, today), eq(teachingEntries.lane, "d")));
  const records = await db.select().from(itemRecords).where(eq(itemRecords.childId, child.id));
  const daily = live.filter((e) => {
    const c = getCourse(e.grade, e.courseId)!;
    return e.pos <= 36 && !e.reviewTerm && c.tracks.some((t) => t.track === "daily");
  });
  const dailyDone =
    daily.length > 0 &&
    daily.every((e) => {
      if (entries.some((t) => t.courseId === e.courseId)) return true;
      const week = getWeek(getCourse(e.grade, e.courseId)!, e.pos);
      const dailyItems = week?.items.filter((i) => i.track === "daily") ?? [];
      return dailyItems.every((i) =>
        records.some((r) => r.courseId === e.courseId && r.grade === e.grade && r.week === e.pos && r.track === "daily" && r.itemKey === i.key),
      );
    }) &&
    entries.length > 0;
  const where = and(eq(streakDays.childId, child.id), eq(streakDays.date, today));
  const [cur] = await db.select().from(streakDays).where(where);
  if (dailyDone && cur?.status !== "done") {
    await db
      .insert(streakDays)
      .values({ childId: child.id, date: today, status: "done" })
      .onConflictDoUpdate({ target: [streakDays.childId, streakDays.date], set: { status: "done" } });
  } else if (!dailyDone && cur?.status === "done") {
    await db.delete(streakDays).where(where);
  }
}

// ---------------------------------------------------------------------------
// Term checks, review weeks and paper check-ins

export async function recordTermCheck(db: Db, childId: string, grade: number, courseId: string, term: number, input: GateInput) {
  await db.transaction(async (tx) => {
    const e = await enrollment(tx, childId, grade, courseId);
    if (!e || e.reviewTerm || e.pos > 36 || !isGateWeek(e.pos) || termOfWeek(e.pos) !== term) return;
    const course = courseOrThrow(grade, courseId);
    const info = masteryInfo(course, term);
    const r = gateTransition(info, term, e.pos, input);
    await tx
      .insert(gates)
      .values({ childId, grade, courseId, term, ...r.gate })
      .onConflictDoUpdate({ target: [gates.childId, gates.grade, gates.courseId, gates.term], set: { ...r.gate, recordedAt: new Date() } });
    await tx
      .update(enrollments)
      .set({ pos: r.pos, reviewTerm: r.reviewTerm, followUpWeek: r.followUp?.week ?? null, followUpText: r.followUp?.text ?? null })
      .where(and(eq(enrollments.childId, childId), eq(enrollments.grade, grade), eq(enrollments.courseId, courseId)));
    await logCheckin(tx, childId, grade, courseId, `${course.course} · Term ${term} check`, r.result);
  });
}

export async function reviewWeekDone(db: Db, childId: string, grade: number, courseId: string) {
  await db.transaction(async (tx) => {
    const e = await enrollment(tx, childId, grade, courseId);
    if (!e?.reviewTerm) return;
    const course = courseOrThrow(grade, courseId);
    await tx
      .update(enrollments)
      .set({ reviewTerm: null })
      .where(and(eq(enrollments.childId, childId), eq(enrollments.grade, grade), eq(enrollments.courseId, courseId)));
    await logCheckin(tx, childId, grade, courseId, `${course.course} · Review week`, "Done");
  });
}

/** Paper mode: the week's booklet pages are finished, so the course moves on. */
export async function paperWeekDone(db: Db, childId: string, grade: number, courseId: string, week: number) {
  await db.transaction(async (tx) => {
    const e = await enrollment(tx, childId, grade, courseId);
    if (!e || e.pos !== week || e.reviewTerm || e.pos > 36 || isGateWeek(e.pos)) return;
    const course = courseOrThrow(grade, courseId);
    await tx
      .update(enrollments)
      .set({ pos: e.pos + 1 })
      .where(and(eq(enrollments.childId, childId), eq(enrollments.grade, grade), eq(enrollments.courseId, courseId)));
    await logCheckin(tx, childId, grade, courseId, `${course.course} · Week ${e.pos}`, "Done");
  });
}

/** Paper mode: the week isn't finished; keep working from the same pages. */
export async function carryOver(db: Db, childId: string, grade: number, courseId: string) {
  const e = await enrollment(db, childId, grade, courseId);
  if (!e || e.pos > 36) return;
  const course = courseOrThrow(grade, courseId);
  await logCheckin(db, childId, grade, courseId, `${course.course} · ${e.reviewTerm ? "Review week" : `Week ${e.pos}`}`, "Carried over");
}

export async function markPrinted(db: Db, childId: string, docs: { grade: number; courseId: string; doc: string }[]) {
  if (!docs.length) return;
  await db
    .insert(printedDocs)
    .values(docs.map((d) => ({ childId, ...d })))
    .onConflictDoUpdate({ target: [printedDocs.childId, printedDocs.grade, printedDocs.courseId, printedDocs.doc], set: { printedAt: new Date() } });
}

// ---------------------------------------------------------------------------
// Attendance and the streak

export async function setPause(db: Db, childId: string, today: DateKey, kind: "sick" | "travel" | null) {
  const where = and(eq(streakDays.childId, childId), eq(streakDays.date, today));
  if (!kind) {
    await db.delete(streakDays).where(and(where, sql`${streakDays.status} in ('sick', 'travel')`));
    return;
  }
  await db
    .insert(streakDays)
    .values({ childId, date: today, status: kind })
    .onConflictDoUpdate({ target: [streakDays.childId, streakDays.date], set: { status: kind } });
}

async function attendanceRow(db: Conn, childId: string, date: DateKey) {
  const [row] = await db.select().from(attendanceDays).where(and(eq(attendanceDays.childId, childId), eq(attendanceDays.date, date)));
  return row ?? null;
}

async function saveAttendance(db: Conn, childId: string, date: DateKey, set: Partial<typeof attendanceDays.$inferInsert>) {
  await db
    .insert(attendanceDays)
    .values({ childId, date, ...set })
    .onConflictDoUpdate({ target: [attendanceDays.childId, attendanceDays.date], set });
}

export async function addExtra(db: Db, childId: string, today: DateKey, extra: ExtraActivity) {
  const row = await attendanceRow(db, childId, today);
  await saveAttendance(db, childId, today, { extra: [...(row?.extra ?? []), extra] });
}

export async function removeExtra(db: Db, childId: string, today: DateKey, index: number) {
  const row = await attendanceRow(db, childId, today);
  if (!row) return;
  await saveAttendance(db, childId, today, { extra: row.extra.filter((_, i) => i !== index) });
}

/** Paper mode: "We did today's routine from the booklets" counts a usual day's routine time. */
/** `practiceMins`: the day's guide practice on paper (the readiness plan in weeks 34–35), counted with the routine. */
export async function togglePaperRoutine(db: Db, child: ChildRef, today: DateKey, practiceMins = 0) {
  const row = await attendanceRow(db, child.id, today);
  const on = !row?.paperRoutine;
  const live = await liveEnrollments(db, child.id);
  const usual = Math.round(live.filter((e) => e.pos <= 36).reduce((a, e) => a + usualDayMinutes(getCourse(e.grade, e.courseId)!), 0));
  await saveAttendance(db, child.id, today, { paperRoutine: on, routineMins: on ? usual + practiceMins : 0 });
}

// ---------------------------------------------------------------------------
// Grade 3 test readiness: practice sessions and the test date

const sessionWhere = (childId: string, session: number) =>
  and(
    eq(guideSessions.childId, childId),
    eq(guideSessions.grade, READINESS_GRADE),
    eq(guideSessions.guideId, READINESS_GUIDE),
    eq(guideSessions.session, session),
  );

function checkSession(session: number) {
  if (!Number.isInteger(session) || session < 1 || session > 10) throw new Error(`No practice session ${session}`);
}

export async function recordReadiness(db: Db, child: ChildRef, today: DateKey, session: number) {
  checkSession(session);
  await db
    .insert(guideSessions)
    .values({ childId: child.id, grade: READINESS_GRADE, guideId: READINESS_GUIDE, session, doneOn: today })
    .onConflictDoNothing();
  await syncDay(db, child, today);
}

/** Undo a session recorded today. Earlier days' sessions stay in the record. */
export async function undoReadiness(db: Db, child: ChildRef, today: DateKey, session: number) {
  checkSession(session);
  await db.delete(guideSessions).where(and(sessionWhere(child.id, session), eq(guideSessions.doneOn, today)));
  await syncDay(db, child, today);
}

/** Paper check-in: the week's five sessions are done. */
export async function readinessWeekDone(db: Db, childId: string, today: DateKey, week: 34 | 35) {
  const sessions = Array.from({ length: 10 }, (_, i) => i + 1).filter((s) => sessionSlot(s).week === week);
  await db
    .insert(guideSessions)
    .values(sessions.map((session) => ({ childId, grade: READINESS_GRADE, guideId: READINESS_GUIDE, session, doneOn: today })))
    .onConflictDoNothing();
}

/** Record (or, with null, clear) the day a standardized test was given. */
export async function setTestDate(db: Db, childId: string, testId: string, givenOn: DateKey | null) {
  const where = and(eq(testRecords.childId, childId), eq(testRecords.testId, testId));
  if (!givenOn) {
    await db.delete(testRecords).where(where);
    return;
  }
  if (!isDateKey(givenOn)) throw new Error("Not a date");
  await db
    .insert(testRecords)
    .values({ childId, testId, givenOn })
    .onConflictDoUpdate({ target: [testRecords.childId, testRecords.testId], set: { givenOn, updatedAt: new Date() } });
}

// ---------------------------------------------------------------------------
// Household calendar and settings

export async function setSchoolDays(db: Db, householdId: string, pattern: "mf" | "ms") {
  await db.update(households).set({ schoolDays: pattern === "ms" ? MON_SAT : MON_FRI }).where(eq(households.id, householdId));
}

export async function setCalStart(db: Db, householdId: string, date: DateKey) {
  if (!isDateKey(date)) throw new Error("Bad date");
  await db.update(households).set({ calStart: date }).where(eq(households.id, householdId));
}

export async function toggleHolidayTeach(db: Db, householdId: string, date: DateKey) {
  if (!isDateKey(date)) throw new Error("Bad date");
  const where = and(eq(holidayTeach.householdId, householdId), eq(holidayTeach.date, date));
  const [row] = await db.select().from(holidayTeach).where(where);
  if (row) await db.delete(holidayTeach).where(where);
  else await db.insert(holidayTeach).values({ householdId, date });
}

export async function addBreak(db: Db, householdId: string, label: string, from: DateKey, to: DateKey) {
  const name = label.trim().slice(0, 80);
  if (!name || !isDateKey(from) || !isDateKey(to) || from > to) throw new Error("Bad break");
  await db.insert(calendarBreaks).values({ householdId, label: name, from, to });
}

export async function removeBreak(db: Db, householdId: string, id: string) {
  await db.delete(calendarBreaks).where(and(eq(calendarBreaks.householdId, householdId), eq(calendarBreaks.id, id)));
}

/** Put back the suggested breaks for the year and make every holiday a day off again. */
export async function resetCalendar(db: Db, householdId: string, start: DateKey) {
  await db.transaction(async (tx) => {
    await tx.delete(calendarBreaks).where(eq(calendarBreaks.householdId, householdId));
    await tx.delete(holidayTeach).where(eq(holidayTeach.householdId, householdId));
    const breaks = defaultBreaks(start);
    if (breaks.length) await tx.insert(calendarBreaks).values(breaks.map((b) => ({ householdId, ...b })));
  });
}

export async function setMode(db: Db, childId: string, mode: "screen" | "paper") {
  await db.update(children).set({ mode }).where(eq(children.id, childId));
}

export async function updateHouseholdPrefs(db: Db, householdId: string, patch: Record<string, unknown>) {
  await db
    .update(households)
    .set({ prefs: sql`${households.prefs} || ${JSON.stringify(patch)}::jsonb` })
    .where(eq(households.id, householdId));
}

export async function updateHousehold(db: Db, householdId: string, set: { name?: string; state?: string; timezone?: string }) {
  await db.update(households).set(set).where(eq(households.id, householdId));
}

export async function updateChild(db: Db, childId: string, set: { name?: string; priorDays?: number }) {
  await db.update(children).set(set).where(eq(children.id, childId));
}

export async function removeChild(db: Db, childId: string) {
  await db.delete(children).where(eq(children.id, childId));
}
