import { and, asc, eq } from "drizzle-orm";
import { firstWeekOfTerm } from "@/lib/content/year";
import type { Db } from "./client";
import { calendarBreaks, children, courses, enrollments, gates, holidayTeach, households } from "./schema";

export type Household = typeof households.$inferSelect;
export type Child = typeof children.$inferSelect;
export type Enrollment = typeof enrollments.$inferSelect;
export type Gate = typeof gates.$inferSelect;
export type CalendarBreak = typeof calendarBreaks.$inferSelect;

export async function createHousehold(
  db: Db,
  input: Pick<typeof households.$inferInsert, "name"> & Partial<typeof households.$inferInsert>,
): Promise<Household> {
  const [row] = await db.insert(households).values(input).returning();
  return row;
}

export type NewChild = {
  name: string;
  grade: number;
  mode?: "screen" | "paper";
  priorDays?: number;
  /** Placement: the term each course starts in (default Term 1). */
  startTerms?: Record<string, number>;
  /** Electives switched on from the start. */
  electives?: string[];
};

/**
 * Add a child and enroll them in every required course of their grade, at
 * the first week of the term placement set (Term 1 by default).
 */
export async function addChild(db: Db, householdId: string, input: NewChild): Promise<Child> {
  return db.transaction(async (tx) => {
    const siblings = await tx.select({ id: children.id }).from(children).where(eq(children.householdId, householdId));
    const [child] = await tx
      .insert(children)
      .values({
        householdId,
        name: input.name,
        grade: input.grade,
        mode: input.mode,
        priorDays: input.priorDays,
        sortOrder: siblings.length,
      })
      .returning();

    const catalog = await tx.select().from(courses).where(eq(courses.grade, input.grade));
    const electives = new Set(input.electives ?? []);
    for (const id of electives) {
      if (!catalog.some((c) => c.id === id && c.elective)) {
        throw new Error(`${id} is not a Grade ${input.grade} elective`);
      }
    }
    const rows = catalog
      .filter((c) => !c.elective || electives.has(c.id))
      .map((c) => ({
        childId: child.id,
        grade: input.grade,
        courseId: c.id,
        pos: firstWeekOfTerm(input.startTerms?.[c.id] ?? 1),
      }));
    if (rows.length) await tx.insert(enrollments).values(rows);
    return child;
  });
}

/**
 * Switch an elective on or off for a child. Switching on for the first time
 * starts it at week 1; switching off keeps its position for later.
 */
export async function setElective(db: Db, childId: string, courseId: string, on: boolean): Promise<void> {
  const [child] = await db.select().from(children).where(eq(children.id, childId));
  if (!child) throw new Error(`No child ${childId}`);
  const [course] = await db
    .select()
    .from(courses)
    .where(and(eq(courses.grade, child.grade), eq(courses.id, courseId)));
  if (!course?.elective) throw new Error(`${courseId} is not a Grade ${child.grade} elective`);
  await db
    .insert(enrollments)
    .values({ childId, grade: child.grade, courseId, pos: 1, active: on })
    .onConflictDoUpdate({
      target: [enrollments.childId, enrollments.grade, enrollments.courseId],
      set: { active: on },
    });
}

export type HouseholdSnapshot = Household & {
  breaks: CalendarBreak[];
  holidayTeach: string[];
  children: (Child & { enrollments: Enrollment[]; gates: Gate[] })[];
};

/** A household with its calendar settings and each child's course positions and term checks. */
export async function getHousehold(db: Db, householdId: string): Promise<HouseholdSnapshot | null> {
  const [household] = await db.select().from(households).where(eq(households.id, householdId));
  if (!household) return null;
  const [breaks, holidays, kids] = await Promise.all([
    db.select().from(calendarBreaks).where(eq(calendarBreaks.householdId, householdId)).orderBy(asc(calendarBreaks.from)),
    db.select().from(holidayTeach).where(eq(holidayTeach.householdId, householdId)).orderBy(asc(holidayTeach.date)),
    db.select().from(children).where(eq(children.householdId, householdId)).orderBy(asc(children.sortOrder)),
  ]);
  const withCourses = await Promise.all(
    kids.map(async (child) => {
      const [enr, gts] = await Promise.all([
        db
          .select({ e: enrollments })
          .from(enrollments)
          .innerJoin(courses, and(eq(courses.grade, enrollments.grade), eq(courses.id, enrollments.courseId)))
          .where(eq(enrollments.childId, child.id))
          .orderBy(asc(enrollments.grade), asc(courses.sortOrder)),
        db
          .select()
          .from(gates)
          .where(eq(gates.childId, child.id))
          .orderBy(asc(gates.grade), asc(gates.courseId), asc(gates.term)),
      ]);
      return { ...child, enrollments: enr.map((r) => r.e), gates: gts };
    }),
  );
  return { ...household, breaks, holidayTeach: holidays.map((h) => h.date), children: withCourses };
}
