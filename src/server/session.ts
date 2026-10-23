import "server-only";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getDb } from "@/db/client";
import { getHousehold, type HouseholdSnapshot } from "@/db/households";
import { coops, households } from "@/db/schema";
import { hasAccess } from "@/lib/domain/billing";
import { createSession, deleteSession, sessionUser, SESSION_DAYS, type User } from "./auth/accounts";
import { billingEnabled } from "./billing/stripe";

/*
 * Who is signed in. The session cookie holds a random token; the database
 * keeps only its hash. Parents get their household; students get only the
 * student module.
 */

const SESSION_COOKIE = "pha_session";
const CHILD_COOKIE = "pha_child";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const cookieOptions = (maxAge: number) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge,
  path: "/",
});

export type Session = { user: User; household: HouseholdSnapshot };

/** The signed-in user and their household, once per request. */
export const getSession = cache(async (): Promise<Session | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const db = await getDb();
  const user = await sessionUser(db, token);
  if (!user) return null;
  const household = await getHousehold(db, user.householdId);
  return household ? { user, household } : null;
});

export async function startSession(userId: string) {
  const { token } = await createSession(await getDb(), userId);
  (await cookies()).set(SESSION_COOKIE, token, cookieOptions(SESSION_DAYS * 86_400));
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await deleteSession(await getDb(), token);
  jar.delete(SESSION_COOKIE);
  jar.delete(CHILD_COOKIE);
}

export async function setChildCookie(id: string) {
  (await cookies()).set(CHILD_COOKIE, id, cookieOptions(365 * 86_400));
}

/** A signed-in parent; others go to sign in (or, for students, to their module). */
export async function requireParent(): Promise<Session> {
  const s = await getSession();
  if (!s) redirect("/sign-in");
  if (s.user.role !== "parent") redirect("/student");
  return s;
}

/** Whether the household's plan (or its co-op's) keeps the app open. */
export async function householdHasAccess(h: HouseholdSnapshot): Promise<boolean> {
  if (!billingEnabled()) return true;
  let coopStatus: string | null = null;
  if (h.coopId) {
    const db = await getDb();
    const [owner] = await db
      .select({ status: households.subscriptionStatus })
      .from(coops)
      .innerJoin(households, eq(households.id, coops.ownerHouseholdId))
      .where(eq(coops.id, h.coopId));
    coopStatus = owner?.status ?? null;
  }
  return hasAccess({ billingEnabled: true, status: h.subscriptionStatus, coopStatus });
}

/** The parent's household, onboarded and with a plan; otherwise sends them to finish either. */
export async function requireHousehold(): Promise<HouseholdSnapshot> {
  const { household } = await requireParent();
  if (!household.onboardedAt) redirect("/start");
  if (!(await householdHasAccess(household))) redirect("/billing");
  return household;
}

/** The signed-in parent's household, for server actions, or null. */
export async function currentHousehold(): Promise<HouseholdSnapshot | null> {
  const s = await getSession();
  return s?.user.role === "parent" ? s.household : null;
}

/** The selected child (remembered per browser), defaulting to the first. */
export async function selectedChild<T extends { id: string }>(children: T[]): Promise<T | null> {
  const id = (await cookies()).get(CHILD_COOKIE)?.value;
  return children.find((c) => c.id === (id && UUID_RE.test(id) ? id : "")) ?? children[0] ?? null;
}

/** The household and a child of it, for a server action. Throws if the child isn't theirs. */
export async function requireOwnChild(childId: string) {
  const h = await currentHousehold();
  if (!h) throw new Error("Not signed in");
  const child = h.children.find((c) => c.id === childId);
  if (!child) throw new Error("Not your child");
  return { household: h, child };
}
