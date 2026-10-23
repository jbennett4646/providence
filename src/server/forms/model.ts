import "server-only";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { filings, reportNotes, users } from "@/db/schema";
import { getCourse } from "@/lib/content/load";
import { termOfWeek } from "@/lib/content/year";
import { summarize } from "@/lib/domain/attendance";
import { GEORGIA, type StateRules } from "@/lib/domain/compliance";
import { fmtLong, type DateKey } from "@/lib/domain/dates";
import { ageOn, declarationDue, declarationMissing, schoolYearLabel, schoolYearPeriod } from "@/lib/domain/forms";
import { gradeLabel } from "@/lib/domain/grades";
import type { HouseholdSnapshot } from "@/db/households";
import { householdContext, loadChildRecords, type Child, type HouseholdContext } from "../state";
import { childProgress, isScored, liveCourses } from "../views";

/*
 * What goes on the Declaration of Intent and the annual progress report,
 * prefilled from the household and the teaching record.
 */

export const DECLARATION = "declaration";

export async function declarationStatus(h: HouseholdSnapshot, ctx: HouseholdContext) {
  const db = await getDb();
  const all = await db.select().from(filings).where(and(eq(filings.householdId, h.id), eq(filings.form, DECLARATION)));
  const year = ctx.calendar.start;
  const filed = all.find((f) => f.schoolYear === year) ?? null;
  const firstYear = !all.some((f) => f.schoolYear < year);
  return { filed, due: declarationDue(year, firstYear), year };
}

export type DeclarationModel = {
  schoolYear: string;
  period: { from: string; to: string };
  parentName: string;
  email: string;
  phone: string;
  address: string[];
  county: string;
  state: string;
  students: { name: string; age: number | null; grade: string; birthDate: string | null }[];
  missing: string[];
  prepared: string;
};

export async function declarationModel(h: HouseholdSnapshot, ctx: HouseholdContext): Promise<DeclarationModel> {
  const db = await getDb();
  const [parent] = await db.select({ email: users.email }).from(users).where(and(eq(users.householdId, h.id), eq(users.role, "parent")));
  const year = ctx.calendar.start;
  const period = schoolYearPeriod(year);
  return {
    schoolYear: schoolYearLabel(year),
    period: { from: fmtLong(period.from), to: fmtLong(period.to) },
    parentName: h.parentName ?? "",
    email: parent?.email ?? "",
    phone: h.phone ?? "",
    address: [h.addressLine1, h.addressLine2, h.city ? `${h.city}, ${h.state} ${h.postalCode ?? ""}`.trim() : null].filter((x): x is string => !!x?.trim()),
    county: h.county ?? "",
    state: h.state,
    students: h.children.map((c) => ({
      name: c.name,
      birthDate: c.birthDate,
      // Age on the first day of the school year.
      age: c.birthDate ? ageOn(c.birthDate, year) : null,
      grade: gradeLabel(c.grade),
    })),
    missing: declarationMissing({ ...h, children: h.children }),
    prepared: fmtLong(ctx.today),
  };
}

export type ReportCourse = { name: string; position: string; progress: string; checks: string[]; standing: string };
export type ReportSubject = { name: string; courses: ReportCourse[]; note: string };

export type ReportModel = {
  student: string;
  age: number | null;
  household: string;
  parentName: string;
  schoolYear: string;
  period: { from: string; to: string };
  gradeInProgress: string;
  completed: string;
  attendance: { days: number; required: number; loggedHere: number; priorDays: number; averageHours: string; shortDays: number };
  subjects: ReportSubject[];
  beyond: ReportCourse[];
  rules: StateRules;
  georgia: boolean;
  prepared: string;
};

/** The subjects the report is organised by: the state's required subjects, or Georgia's as a default. */
export function reportSubjects(ctx: HouseholdContext) {
  return (ctx.rules ?? GEORGIA).subjects;
}

export async function reportNotesFor(childId: string, year: DateKey): Promise<Map<string, string>> {
  const db = await getDb();
  const rows = await db.select().from(reportNotes).where(and(eq(reportNotes.childId, childId), eq(reportNotes.schoolYear, year)));
  return new Map(rows.map((r) => [r.subject, r.note]));
}

function courseLine(child: Child, courseId: string): ReportCourse | null {
  const e = child.enrollments.find((x) => x.courseId === courseId && x.active);
  const course = e ? getCourse(e.grade, courseId) : null;
  if (!e || !course) return null;
  const done = Math.min(e.pos - 1, 36);
  const gates = child.gates.filter((g) => g.courseId === courseId && g.grade === e.grade).sort((a, b) => a.term - b.term);
  const checks = gates.map((g) => `Term ${g.term}: ${g.score != null ? `${g.score} of ${g.of}, ${g.pass ? "met the mastery line" : "below the mastery line"}` : "completed"}`);
  const scored = isScored(course);
  const below = gates.filter((g) => g.score != null && !g.pass).length;
  return {
    name: course.course,
    position: e.pos > 36 ? `${gradeLabel(e.grade)} finished` : e.reviewTerm ? `Review week after Term ${e.reviewTerm}` : `Term ${termOfWeek(e.pos)} · Week ${e.pos} of 36`,
    progress: `${done} of 36 weeks completed`,
    checks,
    standing: !scored ? "Completion only (no scored checks)" : !gates.some((g) => g.score != null) ? "No scored term check yet" : below ? `${below} check${below === 1 ? "" : "s"} below the line, reviewed` : "Mastered",
  };
}

export async function reportModel(h: HouseholdSnapshot, child: Child): Promise<ReportModel> {
  const ctx = householdContext(h);
  const rec = await loadChildRecords(child.id, ctx.today);
  const notes = await reportNotesFor(child.id, ctx.calendar.start);
  const { floor } = childProgress(child);
  const att = summarize(rec.attendance, ctx.minutesPerDay, child.priorDays);
  const subjects = reportSubjects(ctx);
  const inSubjects = new Set(subjects.flatMap((s) => s.courses));
  const period = schoolYearPeriod(ctx.calendar.start);
  return {
    student: child.name,
    age: child.birthDate ? ageOn(child.birthDate, ctx.today) : null,
    household: h.name,
    parentName: h.parentName ?? "",
    schoolYear: schoolYearLabel(ctx.calendar.start),
    period: { from: fmtLong(period.from), to: fmtLong(period.to) },
    gradeInProgress: floor?.label ?? gradeLabel(child.grade),
    completed: floor?.completedLabel ?? "—",
    attendance: { days: att.days, required: ctx.requiredDays, loggedHere: att.loggedHere, priorDays: child.priorDays, averageHours: att.averageHours, shortDays: att.shortDays },
    subjects: subjects.map((s) => ({
      name: s.name,
      courses: s.courses.map((id) => courseLine(child, id)).filter((x): x is ReportCourse => x !== null),
      note: notes.get(s.name) ?? "",
    })),
    beyond: liveCourses(child)
      .filter(({ course }) => !inSubjects.has(course.id))
      .map(({ course }) => courseLine(child, course.id))
      .filter((x): x is ReportCourse => x !== null),
    rules: ctx.rules ?? GEORGIA,
    georgia: !!ctx.rules && ctx.rules.code === "GA",
    prepared: fmtLong(ctx.today),
  };
}
