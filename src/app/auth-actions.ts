"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { coops, households } from "@/db/schema";
import { subscriptionOpen } from "@/lib/domain/billing";
import {
  AccountError,
  authenticate,
  changePassword as changePasswordDb,
  createParent,
  removeStudentLogin as removeStudentLoginDb,
  requestReset,
  resetPassword as resetPasswordDb,
  setStudentLogin as setStudentLoginDb,
} from "@/server/auth/accounts";
import { isEmail, normalizeEmail, passwordProblem } from "@/server/auth/crypto";
import { clearFailures, isLocked, recordFailure } from "@/server/auth/limiter";
import { joinCoop } from "@/server/billing/subscriptions";
import { sendMail } from "@/server/mail";
import { origin } from "@/server/origin";
import { endSession, getSession, requireOwnChild, startSession } from "@/server/session";

/** `values` echoes what was typed, so a form that comes back with an error keeps it. */
export type FormState = { error?: string; ok?: boolean; message?: string; values?: Record<string, string> };

const field = (f: FormData, k: string, max = 200) => String(f.get(k) ?? "").slice(0, max);

/** Only same-site paths are followed after sign-in. */
function safeNext(next: string): string | null {
  return /^\/(?!\/)[\w\-/?=&.%]*$/.test(next) ? next : null;
}

export async function signUp(_prev: FormState, form: FormData): Promise<FormState> {
  const email = normalizeEmail(field(form, "email", 254));
  const password = field(form, "password");
  const householdName = field(form, "household", 80).trim();
  const state = field(form, "state", 2).toUpperCase();
  const code = field(form, "invite", 20).trim().toUpperCase();
  const values = { household: householdName, email, state, invite: code };
  const fail = (error: string): FormState => ({ error, values });
  if (!householdName) return fail("Give the household a name.");
  if (!isEmail(email)) return fail("Enter a valid email address.");
  const problem = passwordProblem(password);
  if (problem) return fail(problem);
  if (!/^[A-Z]{2}$/.test(state)) return fail("Choose your state.");

  const db = await getDb();
  if (code) {
    const [coop] = await db
      .select({ status: households.subscriptionStatus })
      .from(coops)
      .innerJoin(households, eq(households.id, coops.ownerHouseholdId))
      .where(eq(coops.inviteCode, code.replace(/[^A-Z0-9]/g, "")));
    if (!coop) return fail("That invite code doesn’t match a parish or co-op. Leave it blank to join on your own.");
    if (!subscriptionOpen(coop.status)) return fail("That parish or co-op’s plan isn’t active right now.");
  }
  try {
    const { user, household } = await createParent(db, { email, password, householdName, state });
    if (code) await joinCoop(db, household.id, code).catch(() => undefined);
    await startSession(user.id);
  } catch (e) {
    if (e instanceof AccountError) return fail(e.message);
    throw e;
  }
  redirect("/start?step=children");
}

export async function signIn(_prev: FormState, form: FormData): Promise<FormState> {
  const login = normalizeEmail(field(form, "login", 254));
  const password = field(form, "password");
  const next = safeNext(field(form, "next", 200));
  const values = { login };
  if (!login || !password) return { error: "Enter your email (or username) and password.", values };
  if (isLocked(login)) return { error: "Too many tries. Wait fifteen minutes, or reset your password.", values };
  const db = await getDb();
  const user = await authenticate(db, login, password);
  if (!user) {
    recordFailure(login);
    return { error: "That email or username and password don’t match.", values };
  }
  clearFailures(login);
  await startSession(user.id);
  if (user.role === "student") redirect("/student");
  redirect(next ?? "/parent");
}

export async function signOut() {
  await endSession();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function forgotPassword(_prev: FormState, form: FormData): Promise<FormState> {
  const email = normalizeEmail(field(form, "email", 254));
  if (!isEmail(email)) return { error: "Enter the email you signed up with." };
  const token = await requestReset(await getDb(), email);
  if (token) {
    const link = `${await origin()}/reset?token=${token}`;
    await sendMail({
      to: email,
      subject: "Reset your Providence Home Academy password",
      text: `Someone asked to reset the password for this account. If it was you, choose a new password here within two hours:\n\n${link}\n\nIf it wasn't you, ignore this email; nothing has changed.`,
    });
  }
  return { ok: true, message: "If that email has an account, a reset link is on its way. It works for two hours." };
}

export async function resetPassword(_prev: FormState, form: FormData): Promise<FormState> {
  const token = field(form, "token", 100);
  const password = field(form, "password");
  const problem = passwordProblem(password);
  if (problem) return { error: problem };
  const ok = await resetPasswordDb(await getDb(), token, password);
  if (!ok) return { error: "That reset link has expired or was already used. Ask for a new one." };
  redirect("/sign-in?reset=1");
}

export async function changePassword(_prev: FormState, form: FormData): Promise<FormState> {
  const s = await getSession();
  if (!s) redirect("/sign-in");
  const next = field(form, "next");
  const problem = passwordProblem(next);
  if (problem) return { error: problem };
  const ok = await changePasswordDb(await getDb(), s.user.id, field(form, "current"), next);
  return ok ? { ok: true } : { error: "Your current password isn’t right." };
}

export async function setStudentLogin(childId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const { household } = await requireOwnChild(childId);
  const password = field(form, "password");
  const problem = passwordProblem(password);
  if (problem) return { error: problem };
  try {
    await setStudentLoginDb(await getDb(), household.id, childId, field(form, "username", 40), password);
  } catch (e) {
    if (e instanceof AccountError) return { error: e.message };
    throw e;
  }
  revalidatePath("/settings");
  return { ok: true };
}

export async function removeStudentLogin(childId: string) {
  const { household } = await requireOwnChild(childId);
  await removeStudentLoginDb(await getDb(), household.id, childId);
  revalidatePath("/settings");
}
