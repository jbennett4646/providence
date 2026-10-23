import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import type { HouseholdSnapshot } from "@/db/households";
import { attendanceDays, checkins, itemRecords, printedDocs, streakDays, teachingEntries } from "@/db/schema";
import { buildCalendar, type SchoolCalendar } from "@/lib/domain/calendar";
import { DEFAULT_MINUTES_PER_DAY, DEFAULT_REQUIRED_DAYS, stateRules, type StateRules } from "@/lib/domain/compliance";
import { todayIn, type DateKey } from "@/lib/domain/dates";
import type { StreakStatus } from "@/lib/domain/streak";

export type Child = HouseholdSnapshot["children"][number];

export type HouseholdContext = {
  household: HouseholdSnapshot;
  today: DateKey;
  calendar: SchoolCalendar;
  rules: StateRules | null;
  requiredDays: number;
  minutesPerDay: number;
};

export function householdContext(household: HouseholdSnapshot, now = new Date()): HouseholdContext {
  const today = todayIn(household.timezone, now);
  const rules = stateRules(household.state);
  const requiredDays = rules?.requiredDays ?? DEFAULT_REQUIRED_DAYS;
  const calendar = buildCalendar({
    start: household.calStart ?? today,
    schoolDays: household.schoolDays,
    breaks: household.breaks.map((b) => ({ id: b.id, label: b.label, from: b.from, to: b.to })),
    holidaysTaught: household.holidayTeach,
    requiredDays,
  });
  return { household, today, calendar, rules, requiredDays, minutesPerDay: rules?.minutesPerDay ?? DEFAULT_MINUTES_PER_DAY };
}

export type ChildRecords = {
  records: (typeof itemRecords.$inferSelect)[];
  entries: (typeof teachingEntries.$inferSelect)[];
  attendance: (typeof attendanceDays.$inferSelect)[];
  streak: Map<DateKey, StreakStatus>;
  checkins: (typeof checkins.$inferSelect)[];
  printed: Set<string>;
};

/** Key for a printed booklet: "3:latin:t2". */
export const printKey = (grade: number, courseId: string, doc: string) => `${grade}:${courseId}:${doc}`;

/** Everything recorded for a child that the screens need. */
export async function loadChildRecords(childId: string, today: DateKey): Promise<ChildRecords> {
  const db = await getDb();
  const [records, entries, attendance, streak, log, printed] = await Promise.all([
    db.select().from(itemRecords).where(eq(itemRecords.childId, childId)),
    db.select().from(teachingEntries).where(and(eq(teachingEntries.childId, childId), eq(teachingEntries.date, today))),
    db.select().from(attendanceDays).where(eq(attendanceDays.childId, childId)).orderBy(attendanceDays.date),
    db.select().from(streakDays).where(eq(streakDays.childId, childId)),
    db.select().from(checkins).where(eq(checkins.childId, childId)).orderBy(desc(checkins.createdAt)).limit(8),
    db.select().from(printedDocs).where(eq(printedDocs.childId, childId)),
  ]);
  return {
    records,
    entries,
    attendance,
    streak: new Map(streak.map((s) => [s.date, s.status])),
    checkins: log,
    printed: new Set(printed.map((p) => printKey(p.grade, p.courseId, p.doc))),
  };
}
