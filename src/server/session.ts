import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { getHousehold, type HouseholdSnapshot } from "@/db/households";

/*
 * Which household is using the app. Until accounts arrive, the household is
 * remembered by an unguessable id in a cookie set when it is created on
 * /start. Sign-in replaces this.
 */

const HOUSEHOLD_COOKIE = "pha_household";
const CHILD_COOKIE = "pha_child";
const YEAR = 60 * 60 * 24 * 365;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function setHouseholdCookie(id: string) {
  (await cookies()).set(HOUSEHOLD_COOKIE, id, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: YEAR, path: "/" });
}

export async function setChildCookie(id: string) {
  (await cookies()).set(CHILD_COOKIE, id, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: YEAR, path: "/" });
}

/** The current household, or null if this browser hasn't set one up. */
export async function currentHousehold(): Promise<HouseholdSnapshot | null> {
  const id = (await cookies()).get(HOUSEHOLD_COOKIE)?.value;
  if (!id || !UUID_RE.test(id)) return null;
  return getHousehold(await getDb(), id);
}

/** The current household; sends the browser to /start if there is none. */
export async function requireHousehold(): Promise<HouseholdSnapshot> {
  const h = await currentHousehold();
  if (!h) redirect("/start");
  return h;
}

/** The selected child (remembered per browser), defaulting to the first. */
export async function selectedChild<T extends { id: string }>(children: T[]): Promise<T | null> {
  const id = (await cookies()).get(CHILD_COOKIE)?.value;
  return children.find((c) => c.id === id) ?? children[0] ?? null;
}

/** The household and a child of it, for a server action. Throws if the child isn't theirs. */
export async function requireOwnChild(childId: string) {
  const h = await currentHousehold();
  if (!h) throw new Error("No household");
  const child = h.children.find((c) => c.id === childId);
  if (!child) throw new Error("Not your child");
  return { household: h, child };
}
