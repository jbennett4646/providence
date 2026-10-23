"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { addChild as addChildDb, setElective } from "@/db/households";
import { EXTRA_OPTIONS } from "@/lib/domain/attendance";
import { isDateKey, todayIn } from "@/lib/domain/dates";
import * as m from "@/server/mutations";
import { currentHousehold, requireOwnChild, setChildCookie } from "@/server/session";

/*
 * Server actions behind every button. Each checks the household (and child)
 * belongs to this browser, makes the change, and refreshes the pages.
 */

const refresh = () => revalidatePath("/", "layout");

async function household() {
  const h = await currentHousehold();
  if (!h) redirect("/sign-in");
  return h;
}

async function childCtx(childId: string) {
  const { household: h, child } = await requireOwnChild(childId);
  return { h, child, db: await getDb(), today: todayIn(h.timezone) };
}

const GRADES = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);

function str(form: FormData, key: string, max = 80): string {
  return String(form.get(key) ?? "").trim().slice(0, max);
}

// ---------------------------------------------------------------------------
// Child selection and settings

export async function selectChild(childId: string) {
  await requireOwnChild(childId);
  await setChildCookie(childId);
  refresh();
}

export async function setMode(childId: string, mode: "screen" | "paper") {
  const { db } = await childCtx(childId);
  await m.setMode(db, childId, mode === "paper" ? "paper" : "screen");
  refresh();
}

export async function toggleElective(childId: string, courseId: string) {
  const { db, child } = await childCtx(childId);
  const cur = child.enrollments.find((e) => e.courseId === courseId && e.grade === child.grade);
  await setElective(db, childId, courseId, !cur?.active);
  refresh();
}

export async function dismissWeekNote() {
  const h = await household();
  await m.updateHouseholdPrefs(await getDb(), h.id, { weekNoteSeen: true });
  refresh();
}

export type FormState = { error?: string; ok?: boolean };

export async function addChild(_prev: FormState, form: FormData): Promise<FormState> {
  const h = await household();
  const name = str(form, "name", 40);
  const grade = Number(form.get("grade"));
  const mode = form.get("mode") === "paper" ? "paper" : "screen";
  if (!name) return { error: "Add a name." };
  if (!GRADES.has(grade)) return { error: "Choose a grade." };
  const child = await addChildDb(await getDb(), h.id, { name, grade, mode });
  await setChildCookie(child.id);
  refresh();
  return { ok: true };
}

export async function updateChild(childId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const { db } = await childCtx(childId);
  const name = str(form, "name", 40);
  const priorDays = Math.max(0, Math.min(180, Number(form.get("priorDays") || 0) || 0));
  if (!name) return { error: "Add a name." };
  await m.updateChild(db, childId, { name, priorDays });
  refresh();
  return { ok: true };
}

export async function removeChild(childId: string) {
  const { db } = await childCtx(childId);
  await m.removeChild(db, childId);
  refresh();
}

export async function updateHousehold(_prev: FormState, form: FormData): Promise<FormState> {
  const h = await household();
  const name = str(form, "name");
  const state = str(form, "state", 2).toUpperCase();
  if (!name) return { error: "Give the household a name." };
  if (!/^[A-Z]{2}$/.test(state)) return { error: "Choose a state." };
  await m.updateHousehold(await getDb(), h.id, { name, state });
  refresh();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Teaching on screen

export async function recordItem(childId: string, input: m.RecordInput) {
  const { db, child, today } = await childCtx(childId);
  await m.recordItem(db, child, today, { ...input, outcome: input.outcome === "again" ? "again" : "well" });
  refresh();
}

export async function undoEntry(childId: string, courseId: string, lane: "d" | "q") {
  const { db, child, today } = await childCtx(childId);
  await m.undoEntry(db, child, today, courseId, lane);
  refresh();
}

export async function clearEntry(childId: string, courseId: string, lane: "d" | "q") {
  const { db, today } = await childCtx(childId);
  await m.clearEntry(db, childId, today, courseId, lane);
  refresh();
}

export async function setPause(childId: string, kind: "sick" | "travel" | null) {
  const { db, today } = await childCtx(childId);
  await m.setPause(db, childId, today, kind === "sick" || kind === "travel" ? kind : null);
  refresh();
}

// ---------------------------------------------------------------------------
// Term checks and paper check-ins

export async function recordTermCheck(
  childId: string,
  grade: number,
  courseId: string,
  term: number,
  input: { score?: number; parts?: number[]; chants?: boolean },
) {
  const { db } = await childCtx(childId);
  await m.recordTermCheck(db, childId, grade, courseId, term, {
    score: input.score == null ? undefined : Number(input.score),
    parts: input.parts?.map(Number),
    chants: !!input.chants,
  });
  refresh();
}

export async function reviewWeekDone(childId: string, grade: number, courseId: string) {
  const { db } = await childCtx(childId);
  await m.reviewWeekDone(db, childId, grade, courseId);
  refresh();
}

export async function paperWeekDone(childId: string, grade: number, courseId: string, week: number) {
  const { db } = await childCtx(childId);
  await m.paperWeekDone(db, childId, grade, courseId, week);
  refresh();
}

export async function carryOver(childId: string, grade: number, courseId: string) {
  const { db } = await childCtx(childId);
  await m.carryOver(db, childId, grade, courseId);
  refresh();
}

export async function markPrinted(childId: string, docs: { grade: number; courseId: string; doc: string }[]) {
  const { db } = await childCtx(childId);
  await m.markPrinted(db, childId, docs.filter((d) => /^(plan|t[1-6]|r[1-5])$/.test(d.doc)));
  refresh();
}

// ---------------------------------------------------------------------------
// Attendance

export async function addExtra(childId: string, label: string) {
  const opt = EXTRA_OPTIONS.find((o) => o.label === label);
  if (!opt) return;
  const { db, today } = await childCtx(childId);
  await m.addExtra(db, childId, today, { label: opt.label, mins: opt.mins });
  refresh();
}

export async function removeExtra(childId: string, index: number) {
  const { db, today } = await childCtx(childId);
  await m.removeExtra(db, childId, today, index);
  refresh();
}

export async function togglePaperRoutine(childId: string) {
  const { db, child, today } = await childCtx(childId);
  await m.togglePaperRoutine(db, child, today);
  refresh();
}

// ---------------------------------------------------------------------------
// Calendar

export async function setSchoolDays(pattern: "mf" | "ms") {
  const h = await household();
  await m.setSchoolDays(await getDb(), h.id, pattern === "ms" ? "ms" : "mf");
  refresh();
}

export async function setCalStart(date: string) {
  const h = await household();
  if (!isDateKey(date)) return;
  await m.setCalStart(await getDb(), h.id, date);
  refresh();
}

export async function toggleHolidayTeach(date: string) {
  const h = await household();
  if (!isDateKey(date)) return;
  await m.toggleHolidayTeach(await getDb(), h.id, date);
  refresh();
}

export async function addBreak(label: string, from: string, to: string) {
  const h = await household();
  if (!label.trim() || !isDateKey(from) || !isDateKey(to) || from > to) return;
  await m.addBreak(await getDb(), h.id, label, from, to);
  refresh();
}

export async function removeBreak(id: string) {
  const h = await household();
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  await m.removeBreak(await getDb(), h.id, id);
  refresh();
}

export async function resetCalendar() {
  const h = await household();
  if (!h.calStart) return;
  await m.resetCalendar(await getDb(), h.id, h.calStart);
  refresh();
}
