import { and, count, eq, ne, or } from "drizzle-orm";
import type Stripe from "stripe";
import type { Db } from "@/db/client";
import { coops, households, stripeEvents, users } from "@/db/schema";
import { planForPrice, subscriptionOpen, PLANS, type PlanId } from "@/lib/domain/billing";
import { randomBytes } from "node:crypto";

/*
 * Keeping households in step with Stripe, and the parish plan's co-ops.
 * Takes the Stripe client as an argument so it can be tested without one.
 */

type Household = typeof households.$inferSelect;

/** The Checkout page for subscribing a household to a plan. */
export async function checkoutUrl(db: Db, stripe: Stripe, household: Household, plan: PlanId, origin: string): Promise<string> {
  const price = process.env[PLANS[plan].priceEnv];
  if (!price) throw new Error(`${PLANS[plan].priceEnv} is not set`);
  const customer = await ensureCustomer(db, stripe, household);
  const trial = Number(process.env.STRIPE_TRIAL_DAYS || 0);
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer,
    client_reference_id: household.id,
    line_items: [{ price, quantity: 1 }],
    allow_promotion_codes: true,
    metadata: { householdId: household.id, plan },
    subscription_data: { metadata: { householdId: household.id, plan }, ...(trial > 0 ? { trial_period_days: trial } : {}) },
    success_url: `${origin}/billing?done=1`,
    cancel_url: `${origin}/billing`,
  });
  if (!session.url) throw new Error("Stripe returned no Checkout URL");
  return session.url;
}

/** The Stripe billing portal, where a household changes its card or cancels. */
export async function portalUrl(db: Db, stripe: Stripe, household: Household, origin: string): Promise<string> {
  const customer = await ensureCustomer(db, stripe, household);
  const session = await stripe.billingPortal.sessions.create({ customer, return_url: `${origin}/billing` });
  return session.url;
}

async function ensureCustomer(db: Db, stripe: Stripe, household: Household): Promise<string> {
  if (household.stripeCustomerId) return household.stripeCustomerId;
  const [parent] = await db.select({ email: users.email }).from(users).where(and(eq(users.householdId, household.id), eq(users.role, "parent")));
  const customer = await stripe.customers.create({ name: household.name, email: parent?.email ?? undefined, metadata: { householdId: household.id } });
  await db.update(households).set({ stripeCustomerId: customer.id }).where(eq(households.id, household.id));
  return customer.id;
}

const idOf = (x: string | { id: string } | null | undefined) => (typeof x === "string" ? x : (x?.id ?? null));

/** Apply a Stripe webhook event. Returns false when the event was already handled. */
export async function applyStripeEvent(db: Db, event: Stripe.Event): Promise<boolean> {
  const [fresh] = await db.insert(stripeEvents).values({ id: event.id, type: event.type }).onConflictDoNothing().returning();
  if (!fresh) return false;

  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object;
      const householdId = s.client_reference_id ?? s.metadata?.householdId;
      if (!householdId || !/^[0-9a-f-]{36}$/i.test(householdId)) break;
      await db
        .update(households)
        .set({ stripeCustomerId: idOf(s.customer), subscriptionId: idOf(s.subscription) })
        .where(eq(households.id, householdId));
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
    case "customer.subscription.paused":
    case "customer.subscription.resumed": {
      await syncSubscription(db, event.data.object, event.type === "customer.subscription.deleted");
      break;
    }
  }
  return true;
}

export async function syncSubscription(db: Db, sub: Stripe.Subscription, deleted = false) {
  const customer = idOf(sub.customer);
  const byMeta = sub.metadata?.householdId;
  const match = [byMeta && /^[0-9a-f-]{36}$/i.test(byMeta) ? eq(households.id, byMeta) : null, customer ? eq(households.stripeCustomerId, customer) : null].filter((x) => x !== null);
  if (!match.length) return;
  const [h] = await db.select().from(households).where(or(...match));
  if (!h) return;
  // A household holds one subscription. While one is open, events about another are ignored.
  if (h.subscriptionId && h.subscriptionId !== sub.id && subscriptionOpen(h.subscriptionStatus)) return;

  const item = sub.items?.data?.[0];
  const periodEnd = (item as { current_period_end?: number } | undefined)?.current_period_end ?? (sub as unknown as { current_period_end?: number }).current_period_end;
  const plan = planForPrice(item?.price?.id) ?? ((sub.metadata?.plan as PlanId | undefined) ?? null);
  const status = deleted ? "canceled" : sub.status;
  await db
    .update(households)
    .set({
      stripeCustomerId: customer ?? h.stripeCustomerId,
      subscriptionId: sub.id,
      subscriptionStatus: status,
      currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
      cancelAtPeriodEnd: !!sub.cancel_at_period_end,
      plan: plan ?? h.plan,
    })
    .where(eq(households.id, h.id));
  if (plan === "parish" && subscriptionOpen(status)) await ensureCoop(db, h.id, h.name);
}

// ---------------------------------------------------------------------------
// Co-ops (parish plan)

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function inviteCode(): string {
  const bytes = randomBytes(8);
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

/** The co-op owned by a parish-plan household, created on first use. */
export async function ensureCoop(db: Db, ownerHouseholdId: string, name: string) {
  const [existing] = await db.select().from(coops).where(eq(coops.ownerHouseholdId, ownerHouseholdId));
  if (existing) return existing;
  const [coop] = await db.insert(coops).values({ name, ownerHouseholdId, inviteCode: inviteCode() }).onConflictDoNothing().returning();
  // The owner is covered by its own subscription, but belongs to the co-op too.
  if (coop) await db.update(households).set({ coopId: coop.id }).where(eq(households.id, ownerHouseholdId));
  return coop ?? (await db.select().from(coops).where(eq(coops.ownerHouseholdId, ownerHouseholdId)))[0];
}

export class CoopError extends Error {}

/** Join a co-op by its invite code. */
export async function joinCoop(db: Db, householdId: string, code: string) {
  const clean = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  const [coop] = await db.select().from(coops).where(eq(coops.inviteCode, clean));
  if (!coop) throw new CoopError("That invite code doesn’t match a parish or co-op.");
  const [owner] = await db.select().from(households).where(eq(households.id, coop.ownerHouseholdId));
  if (!subscriptionOpen(owner?.subscriptionStatus)) throw new CoopError("That parish or co-op’s plan isn’t active right now.");
  const [{ n }] = await db.select({ n: count() }).from(households).where(and(eq(households.coopId, coop.id), ne(households.id, coop.ownerHouseholdId)));
  if (n >= coop.maxHouseholds - 1) throw new CoopError("That parish or co-op is full.");
  await db.update(households).set({ coopId: coop.id }).where(eq(households.id, householdId));
  return coop;
}

export async function leaveCoop(db: Db, householdId: string) {
  await db.update(households).set({ coopId: null }).where(eq(households.id, householdId));
}

/** The co-op a household owns or belongs to, with its member count. */
export async function coopFor(db: Db, h: Pick<Household, "id" | "coopId">) {
  if (!h.coopId) return null;
  const [coop] = await db.select().from(coops).where(eq(coops.id, h.coopId));
  if (!coop) return null;
  const [{ n }] = await db.select({ n: count() }).from(households).where(eq(households.coopId, coop.id));
  return { ...coop, members: n, owned: coop.ownerHouseholdId === h.id };
}
