import { and, eq, gt, isNull, lt, or } from "drizzle-orm";
import type { Db } from "@/db/client";
import { children, households, passwordResets, sessions, users } from "@/db/schema";
import { hashPassword, hashToken, newToken, normalizeEmail, verifyPassword } from "./crypto";

/*
 * Accounts, sessions and password resets, as database operations. No
 * cookies or request state here, so it can be tested directly.
 */

export type User = typeof users.$inferSelect;

export const SESSION_DAYS = 30;
const RESET_HOURS = 2;

export class AccountError extends Error {}

export async function createParent(db: Db, input: { email: string; password: string; householdName: string; state: string }) {
  const email = normalizeEmail(input.email);
  const passwordHash = await hashPassword(input.password);
  return db.transaction(async (tx) => {
    const [taken] = await tx.select({ id: users.id }).from(users).where(eq(users.email, email));
    if (taken) throw new AccountError("An account with that email already exists. Sign in instead.");
    const [household] = await tx.insert(households).values({ name: input.householdName, state: input.state }).returning();
    const [user] = await tx.insert(users).values({ role: "parent", email, passwordHash, householdId: household.id }).returning();
    return { user, household };
  });
}

/** The user for an email (parents) or username (students) and password, or null. */
export async function authenticate(db: Db, login: string, password: string): Promise<User | null> {
  const key = normalizeEmail(login);
  const [user] = await db
    .select()
    .from(users)
    .where(or(eq(users.email, key), eq(users.username, key)));
  // Hash anyway when there's no such user, so timing doesn't reveal which logins exist.
  const ok = user ? await verifyPassword(password, user.passwordHash) : (await hashPassword(password), false);
  if (!user || !ok) return null;
  await db.update(users).set({ lastSignInAt: new Date() }).where(eq(users.id, user.id));
  return user;
}

export async function createSession(db: Db, userId: string, now = new Date()): Promise<{ token: string; expiresAt: Date }> {
  const token = newToken();
  const expiresAt = new Date(now.getTime() + SESSION_DAYS * 86_400_000);
  await db.insert(sessions).values({ tokenHash: hashToken(token), userId, expiresAt });
  // Tidy away this user's expired sessions.
  await db.delete(sessions).where(and(eq(sessions.userId, userId), lt(sessions.expiresAt, now)));
  return { token, expiresAt };
}

export async function sessionUser(db: Db, token: string, now = new Date()): Promise<User | null> {
  const [row] = await db
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, now)));
  return row?.user ?? null;
}

export async function deleteSession(db: Db, token: string) {
  await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
}

/** A reset token for the parent with this email, or null if there's none (callers say the same either way). */
export async function requestReset(db: Db, email: string, now = new Date()): Promise<string | null> {
  const [user] = await db.select().from(users).where(eq(users.email, normalizeEmail(email)));
  if (!user) return null;
  const token = newToken();
  await db.insert(passwordResets).values({ tokenHash: hashToken(token), userId: user.id, expiresAt: new Date(now.getTime() + RESET_HOURS * 3_600_000) });
  return token;
}

/** Set a new password from a reset link. Signs out every session. */
export async function resetPassword(db: Db, token: string, password: string, now = new Date()): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return db.transaction(async (tx) => {
    const [r] = await tx
      .select()
      .from(passwordResets)
      .where(and(eq(passwordResets.tokenHash, hashToken(token)), isNull(passwordResets.usedAt), gt(passwordResets.expiresAt, now)));
    if (!r) return false;
    await tx.update(passwordResets).set({ usedAt: now }).where(eq(passwordResets.tokenHash, r.tokenHash));
    await tx.update(users).set({ passwordHash }).where(eq(users.id, r.userId));
    await tx.delete(sessions).where(eq(sessions.userId, r.userId));
    return true;
  });
}

export async function changePassword(db: Db, userId: string, current: string, next: string): Promise<boolean> {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user || !(await verifyPassword(current, user.passwordHash))) return false;
  await db.update(users).set({ passwordHash: await hashPassword(next) }).where(eq(users.id, userId));
  return true;
}

export const STUDENT_GRADE = 6;

/** Give a Grade 6+ child their own login, or replace its username and password. */
export async function setStudentLogin(db: Db, householdId: string, childId: string, username: string, password: string) {
  const name = normalizeEmail(username);
  if (!/^[a-z0-9._-]{3,32}$/.test(name)) throw new AccountError("Usernames are 3 to 32 letters, numbers, dots, dashes or underscores.");
  const [child] = await db.select().from(children).where(and(eq(children.id, childId), eq(children.householdId, householdId)));
  if (!child) throw new AccountError("No such child.");
  if (child.grade < STUDENT_GRADE) throw new AccountError(`Student logins open in Grade ${STUDENT_GRADE}.`);
  const passwordHash = await hashPassword(password);
  await db.transaction(async (tx) => {
    const [taken] = await tx.select().from(users).where(or(eq(users.username, name), eq(users.email, name)));
    if (taken && taken.childId !== childId) throw new AccountError("That username is taken.");
    const [existing] = await tx.select().from(users).where(and(eq(users.childId, childId), eq(users.role, "student")));
    if (existing) {
      await tx.update(users).set({ username: name, passwordHash }).where(eq(users.id, existing.id));
      await tx.delete(sessions).where(eq(sessions.userId, existing.id));
    } else {
      await tx.insert(users).values({ role: "student", username: name, passwordHash, householdId, childId });
    }
  });
}

export async function removeStudentLogin(db: Db, householdId: string, childId: string) {
  await db.delete(users).where(and(eq(users.householdId, householdId), eq(users.childId, childId), eq(users.role, "student")));
}

export async function studentLogins(db: Db, householdId: string) {
  return db
    .select({ childId: users.childId, username: users.username })
    .from(users)
    .where(and(eq(users.householdId, householdId), eq(users.role, "student")));
}
