import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { importCatalog } from "@/db/catalog";
import { connect, connectPglite, migrate, type Db } from "@/db/client";
import { addChild } from "@/db/households";
import { sessions, users } from "@/db/schema";
import {
  AccountError,
  authenticate,
  changePassword,
  createParent,
  createSession,
  deleteSession,
  removeStudentLogin,
  requestReset,
  resetPassword,
  sessionUser,
  setStudentLogin,
} from "./accounts";
import { hashPassword, hashToken, isEmail, newToken, passwordProblem, verifyPassword } from "./crypto";
import { clearFailures, isLocked, recordFailure } from "./limiter";

let db: Db;

beforeAll(async () => {
  const url = process.env.TEST_DATABASE_URL;
  db = url ? await connect(url) : await connectPglite();
  await migrate(db);
  await importCatalog(db);
}, 30_000);

let n = 0;
const email = () => `parent${++n}.${Date.now()}@example.com`;
const PASSWORD = "correct horse battery";

describe("passwords and tokens", () => {
  it("hashes with a salt and verifies", async () => {
    const a = await hashPassword(PASSWORD);
    const b = await hashPassword(PASSWORD);
    expect(a).not.toBe(b);
    expect(a.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword(PASSWORD, a)).toBe(true);
    expect(await verifyPassword("wrong password!", a)).toBe(false);
    expect(await verifyPassword(PASSWORD, "garbage")).toBe(false);
  });

  it("makes unguessable tokens and stores only their hash", () => {
    const t = newToken();
    expect(t).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(hashToken(t)).toMatch(/^[0-9a-f]{64}$/);
    expect(newToken()).not.toBe(t);
  });

  it("checks passwords and emails", () => {
    expect(passwordProblem("short")).toMatch(/at least 10/);
    expect(passwordProblem(PASSWORD)).toBeNull();
    expect(isEmail("a@b.co")).toBe(true);
    expect(isEmail("nope")).toBe(false);
  });

  it("locks a login after repeated failures", () => {
    const key = `k${Date.now()}`;
    for (let i = 0; i < 8; i++) recordFailure(key, 1000);
    expect(isLocked(key, 2000)).toBe(true);
    expect(isLocked(key, 1000 + 16 * 60 * 1000)).toBe(false);
    recordFailure(key);
    clearFailures(key);
    expect(isLocked(key)).toBe(false);
  });
});

describe("parent accounts", () => {
  it("creates a household with one parent, and refuses a second account on the same email", async () => {
    const e = email();
    const { user, household } = await createParent(db, { email: e.toUpperCase(), password: PASSWORD, householdName: "The Tests", state: "GA" });
    expect(user).toMatchObject({ role: "parent", email: e, householdId: household.id });
    await expect(createParent(db, { email: e, password: PASSWORD, householdName: "Again", state: "GA" })).rejects.toBeInstanceOf(AccountError);
  });

  it("signs in by email, case-insensitively, and not with a wrong password", async () => {
    const e = email();
    await createParent(db, { email: e, password: PASSWORD, householdName: "Sign in", state: "GA" });
    expect((await authenticate(db, `  ${e.toUpperCase()} `, PASSWORD))?.email).toBe(e);
    expect(await authenticate(db, e, "not the password")).toBeNull();
    expect(await authenticate(db, "nobody@example.com", PASSWORD)).toBeNull();
  });

  it("keeps a session until it expires or is deleted", async () => {
    const { user } = await createParent(db, { email: email(), password: PASSWORD, householdName: "Sessions", state: "GA" });
    const now = new Date("2026-10-01T00:00:00Z");
    const { token, expiresAt } = await createSession(db, user.id, now);
    expect(expiresAt.getTime() - now.getTime()).toBe(30 * 86_400_000);
    expect((await sessionUser(db, token, now))?.id).toBe(user.id);
    expect(await sessionUser(db, token, new Date(expiresAt.getTime() + 1))).toBeNull();
    expect(await sessionUser(db, "not-a-token", now)).toBeNull();
    const [stored] = await db.select().from(sessions).where(eq(sessions.userId, user.id));
    expect(stored.tokenHash).not.toBe(token);
    await deleteSession(db, token);
    expect(await sessionUser(db, token, now)).toBeNull();
  });

  it("resets a password once, within two hours, and signs out everywhere", async () => {
    const e = email();
    const { user } = await createParent(db, { email: e, password: PASSWORD, householdName: "Reset", state: "GA" });
    const { token: sessionToken } = await createSession(db, user.id);
    expect(await requestReset(db, "nobody@example.com")).toBeNull();
    const token = (await requestReset(db, e))!;
    expect(await resetPassword(db, token, "a brand new password")).toBe(true);
    expect(await resetPassword(db, token, "and another one!!")).toBe(false);
    expect(await sessionUser(db, sessionToken)).toBeNull();
    expect(await authenticate(db, e, "a brand new password")).not.toBeNull();

    const late = (await requestReset(db, e, new Date("2020-01-01T00:00:00Z")))!;
    expect(await resetPassword(db, late, "too late password")).toBe(false);
  });

  it("changes a password only with the current one", async () => {
    const e = email();
    const { user } = await createParent(db, { email: e, password: PASSWORD, householdName: "Change", state: "GA" });
    expect(await changePassword(db, user.id, "wrong", "new password 123")).toBe(false);
    expect(await changePassword(db, user.id, PASSWORD, "new password 123")).toBe(true);
    expect(await authenticate(db, e, "new password 123")).not.toBeNull();
  });
});

describe("student logins", () => {
  it("open from Grade 6, sign in by username, and can be removed", async () => {
    const { household } = await createParent(db, { email: email(), password: PASSWORD, householdName: "Students", state: "GA" });
    const young = await addChild(db, household.id, { name: "Young", grade: 3 });
    const older = await addChild(db, household.id, { name: "Older", grade: 7 });
    await expect(setStudentLogin(db, household.id, young.id, "young1", PASSWORD)).rejects.toThrow(/Grade 6/);
    await expect(setStudentLogin(db, household.id, older.id, "x", PASSWORD)).rejects.toThrow(/3 to 32/);
    const name = `older${Date.now()}`;
    await setStudentLogin(db, household.id, older.id, name, PASSWORD);
    const u = await authenticate(db, name.toUpperCase(), PASSWORD);
    expect(u).toMatchObject({ role: "student", childId: older.id });
    // Changing the login keeps one account.
    await setStudentLogin(db, household.id, older.id, name, "another password!");
    expect(await db.select().from(users).where(eq(users.childId, older.id))).toHaveLength(1);
    await removeStudentLogin(db, household.id, older.id);
    expect(await authenticate(db, name, "another password!")).toBeNull();
  });

  it("refuses a child from another household and a taken username", async () => {
    const a = await createParent(db, { email: email(), password: PASSWORD, householdName: "A", state: "GA" });
    const b = await createParent(db, { email: email(), password: PASSWORD, householdName: "B", state: "GA" });
    const ca = await addChild(db, a.household.id, { name: "CA", grade: 8 });
    const cb = await addChild(db, b.household.id, { name: "CB", grade: 8 });
    await expect(setStudentLogin(db, b.household.id, ca.id, "sneaky", PASSWORD)).rejects.toThrow(/No such child/);
    const name = `taken${Date.now()}`;
    await setStudentLogin(db, a.household.id, ca.id, name, PASSWORD);
    await expect(setStudentLogin(db, b.household.id, cb.id, name, PASSWORD)).rejects.toThrow(/taken/);
  });
});
