"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db/client";
import { children, filings, households, reportNotes } from "@/db/schema";
import { isDateKey, todayIn } from "@/lib/domain/dates";
import { DECLARATION } from "@/server/forms/model";
import { requireOwnChild, requireParent } from "@/server/session";
import { householdContext } from "@/server/state";

export type DetailsState = { error?: string; ok?: boolean };

const text = (f: FormData, k: string, max = 120) => {
  const v = String(f.get(k) ?? "").trim().slice(0, max);
  return v || null;
};

/** The parent's name, the home-study address, and each child's date of birth. */
export async function saveDetails(_prev: DetailsState, form: FormData): Promise<DetailsState> {
  const { household: h } = await requireParent();
  const db = await getDb();
  const today = todayIn(h.timezone);
  for (const c of h.children) {
    const b = String(form.get(`birth:${c.id}`) ?? "");
    if (b && (!isDateKey(b) || b > today)) return { error: `${c.name}’s date of birth isn’t a past date.` };
  }
  const zip = text(form, "postalCode", 10);
  if (zip && !/^\d{5}(-\d{4})?$/.test(zip)) return { error: "Enter a five-digit ZIP code." };
  await db.transaction(async (tx) => {
    await tx
      .update(households)
      .set({
        parentName: text(form, "parentName", 80),
        addressLine1: text(form, "addressLine1"),
        addressLine2: text(form, "addressLine2"),
        city: text(form, "city", 60),
        county: text(form, "county", 60),
        postalCode: zip,
        phone: text(form, "phone", 30),
      })
      .where(eq(households.id, h.id));
    for (const c of h.children) {
      const b = String(form.get(`birth:${c.id}`) ?? "");
      await tx.update(children).set({ birthDate: b || null }).where(eq(children.id, c.id));
    }
  });
  revalidatePath("/records/forms");
  return { ok: true };
}

export async function saveReportNote(childId: string, subject: string, note: string) {
  const { household: h } = await requireOwnChild(childId);
  const year = householdContext(h).calendar.start;
  const db = await getDb();
  const clean = note.trim().slice(0, 4000);
  const where = and(eq(reportNotes.childId, childId), eq(reportNotes.schoolYear, year), eq(reportNotes.subject, subject.slice(0, 60)));
  if (!clean) await db.delete(reportNotes).where(where);
  else
    await db
      .insert(reportNotes)
      .values({ childId, schoolYear: year, subject: subject.slice(0, 60), note: clean })
      .onConflictDoUpdate({ target: [reportNotes.childId, reportNotes.schoolYear, reportNotes.subject], set: { note: clean, updatedAt: new Date() } });
  revalidatePath("/records/forms");
}

export async function markFiled(date: string) {
  const { household: h } = await requireParent();
  if (!isDateKey(date)) return;
  const year = householdContext(h).calendar.start;
  await (await getDb())
    .insert(filings)
    .values({ householdId: h.id, form: DECLARATION, schoolYear: year, filedOn: date })
    .onConflictDoUpdate({ target: [filings.householdId, filings.form, filings.schoolYear], set: { filedOn: date } });
  revalidatePath("/", "layout");
}

export async function unmarkFiled() {
  const { household: h } = await requireParent();
  const year = householdContext(h).calendar.start;
  await (await getDb())
    .delete(filings)
    .where(and(eq(filings.householdId, h.id), eq(filings.form, DECLARATION), eq(filings.schoolYear, year)));
  revalidatePath("/", "layout");
}
