"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { addChild as addChildDb, setElective } from "@/db/households";
import { calendarBreaks, children, enrollments, households } from "@/db/schema";
import { getCourse } from "@/lib/content/load";
import { firstWeekOfTerm } from "@/lib/content/year";
import { defaultBreaks, MON_FRI, MON_SAT } from "@/lib/domain/calendar";
import { isDateKey } from "@/lib/domain/dates";
import { householdHasAccess, requireParent } from "@/server/session";

/*
 * The onboarding steps after the account exists. Placement may only change
 * before onboarding is finished; afterwards positions move by teaching.
 */

export type StepState = { error?: string };

async function onboarding() {
  const { household } = await requireParent();
  if (household.onboardedAt) redirect("/parent");
  return household;
}

export async function addChild(_prev: StepState, form: FormData): Promise<StepState> {
  const h = await onboarding();
  const name = String(form.get("name") ?? "").trim().slice(0, 40);
  const grade = Number(form.get("grade"));
  if (!name) return { error: "Add your child’s name." };
  if (!Number.isInteger(grade) || grade < 0 || grade > 12) return { error: "Choose a grade." };
  await addChildDb(await getDb(), h.id, { name, grade });
  revalidatePath("/start");
  return {};
}

export async function removeChild(childId: string) {
  const h = await onboarding();
  await (await getDb()).delete(children).where(and(eq(children.id, childId), eq(children.householdId, h.id)));
  revalidatePath("/start");
}

export async function savePlacement(form: FormData) {
  const h = await onboarding();
  const db = await getDb();
  for (const child of h.children) {
    for (const e of child.enrollments) {
      const course = getCourse(e.grade, e.courseId);
      if (!course) continue;
      if (course.elective) {
        const on = form.get(`el:${child.id}:${e.courseId}`) === "on";
        if (on !== e.active) await setElective(db, child.id, e.courseId, on);
        continue;
      }
      const term = Number(form.get(`term:${child.id}:${e.courseId}`));
      if (Number.isInteger(term) && term >= 1 && term <= 6) {
        await db
          .update(enrollments)
          .set({ pos: firstWeekOfTerm(term) })
          .where(and(eq(enrollments.childId, child.id), eq(enrollments.grade, e.grade), eq(enrollments.courseId, e.courseId)));
      }
    }
    // Electives switched on for the first time.
    for (const key of form.keys()) {
      const m = /^el:([^:]+):(.+)$/.exec(key);
      if (m && m[1] === child.id && !child.enrollments.some((e) => e.courseId === m[2])) await setElective(db, child.id, m[2], true);
    }
  }
  redirect("/start?step=calendar");
}

export async function saveCalendar(_prev: StepState, form: FormData): Promise<StepState> {
  const h = await onboarding();
  const start = String(form.get("start") ?? "");
  if (!isDateKey(start)) return { error: "Choose the first day of school." };
  const week = form.get("week") === "ms" ? MON_SAT : MON_FRI;
  const db = await getDb();
  await db.transaction(async (tx) => {
    await tx.update(households).set({ calStart: start, schoolDays: week }).where(eq(households.id, h.id));
    // Suggested breaks for the year that starts on this day (replacing any earlier suggestion).
    await tx.delete(calendarBreaks).where(eq(calendarBreaks.householdId, h.id));
    const breaks = defaultBreaks(start);
    if (breaks.length) await tx.insert(calendarBreaks).values(breaks.map((b) => ({ householdId: h.id, ...b })));
    for (const c of h.children) {
      const prior = Math.max(0, Math.min(180, Number(form.get(`prior:${c.id}`) || 0) || 0));
      await tx.update(children).set({ priorDays: prior }).where(eq(children.id, c.id));
    }
  });
  redirect("/start?step=teaching");
}

export async function finish(form: FormData) {
  const h = await onboarding();
  const db = await getDb();
  for (const c of h.children) {
    const mode = form.get(`mode:${c.id}`) === "paper" ? "paper" : "screen";
    await db.update(children).set({ mode }).where(eq(children.id, c.id));
  }
  await db.update(households).set({ onboardedAt: new Date() }).where(eq(households.id, h.id));
  revalidatePath("/", "layout");
  redirect((await householdHasAccess(h)) ? "/parent" : "/billing");
}
