import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { importCatalog } from "@/db/catalog";
import { connect, connectPglite, migrate, type Db } from "@/db/client";
import { createHousehold } from "@/db/households";
import { households } from "@/db/schema";
import { hasAccess, planForPrice } from "@/lib/domain/billing";
import { applyStripeEvent, coopFor, inviteCode, joinCoop, leaveCoop } from "./subscriptions";

let db: Db;
const env = { ...process.env };

beforeAll(async () => {
  const url = process.env.TEST_DATABASE_URL;
  db = url ? await connect(url) : await connectPglite();
  await migrate(db);
  await importCatalog(db);
  process.env.STRIPE_PRICE_HOUSEHOLD = "price_household";
  process.env.STRIPE_PRICE_PARISH = "price_parish";
}, 30_000);

afterAll(() => {
  process.env = env;
});

let seq = 0;
const id = (p: string) => `${p}_${Date.now()}_${++seq}`;

function subEvent(type: string, sub: Partial<Stripe.Subscription> & { id: string }): Stripe.Event {
  return { id: id("evt"), type, data: { object: sub } } as unknown as Stripe.Event;
}

function subscription(over: { id?: string; customer: string; status: string; price: string; householdId?: string; periodEnd?: number; cancel?: boolean }) {
  return {
    id: over.id ?? id("sub"),
    object: "subscription",
    customer: over.customer,
    status: over.status,
    cancel_at_period_end: !!over.cancel,
    metadata: over.householdId ? { householdId: over.householdId } : {},
    items: { data: [{ price: { id: over.price }, current_period_end: over.periodEnd ?? 1_800_000_000 }] },
  } as unknown as Stripe.Subscription;
}

const get = async (hid: string) => (await db.select().from(households).where(eq(households.id, hid)))[0];

describe("access", () => {
  it("is open when billing isn't configured", () => {
    expect(hasAccess({ billingEnabled: false, status: null })).toBe(true);
  });
  it("needs an open subscription of the household or its co-op", () => {
    expect(hasAccess({ billingEnabled: true, status: null })).toBe(false);
    expect(hasAccess({ billingEnabled: true, status: "active" })).toBe(true);
    expect(hasAccess({ billingEnabled: true, status: "trialing" })).toBe(true);
    expect(hasAccess({ billingEnabled: true, status: "past_due" })).toBe(true);
    expect(hasAccess({ billingEnabled: true, status: "canceled" })).toBe(false);
    expect(hasAccess({ billingEnabled: true, status: "canceled", coopStatus: "active" })).toBe(true);
  });
  it("recognises the plans by price", () => {
    expect(planForPrice("price_household")).toBe("household");
    expect(planForPrice("price_parish")).toBe("parish");
    expect(planForPrice("price_other")).toBeNull();
  });
});

describe("Stripe events", () => {
  it("links the customer at checkout, then follows the subscription", async () => {
    const h = await createHousehold(db, { name: "Billing" });
    const customer = id("cus");
    const subId = id("sub");
    await applyStripeEvent(db, {
      id: id("evt"),
      type: "checkout.session.completed",
      data: { object: { client_reference_id: h.id, customer, subscription: subId, metadata: {} } },
    } as unknown as Stripe.Event);
    expect(await get(h.id)).toMatchObject({ stripeCustomerId: customer, subscriptionId: subId });

    const sub = subscription({ id: subId, customer, status: "active", price: "price_household", periodEnd: 1_900_000_000 });
    await applyStripeEvent(db, subEvent("customer.subscription.updated", sub));
    expect(await get(h.id)).toMatchObject({ subscriptionStatus: "active", plan: "household", cancelAtPeriodEnd: false });
    expect((await get(h.id)).currentPeriodEnd?.getTime()).toBe(1_900_000_000_000);

    await applyStripeEvent(db, subEvent("customer.subscription.updated", { ...sub, cancel_at_period_end: true }));
    expect((await get(h.id)).cancelAtPeriodEnd).toBe(true);
    await applyStripeEvent(db, subEvent("customer.subscription.deleted", sub));
    expect((await get(h.id)).subscriptionStatus).toBe("canceled");
  });

  it("applies each event once", async () => {
    const h = await createHousehold(db, { name: "Once" });
    const customer = id("cus");
    await db.update(households).set({ stripeCustomerId: customer }).where(eq(households.id, h.id));
    const ev = subEvent("customer.subscription.created", subscription({ customer, status: "active", price: "price_household" }));
    expect(await applyStripeEvent(db, ev)).toBe(true);
    expect(await applyStripeEvent(db, ev)).toBe(false);
  });

  it("finds the household by subscription metadata before the customer is linked", async () => {
    const h = await createHousehold(db, { name: "Meta" });
    await applyStripeEvent(db, subEvent("customer.subscription.created", subscription({ customer: id("cus"), status: "trialing", price: "price_household", householdId: h.id })));
    expect((await get(h.id)).subscriptionStatus).toBe("trialing");
  });

  it("ignores an event that names no household", async () => {
    const sub = subscription({ customer: "", status: "active", price: "price_household" });
    expect(await applyStripeEvent(db, subEvent("customer.subscription.created", { ...sub, customer: null as unknown as string }))).toBe(true);
  });
});

describe("parish and co-op plan", () => {
  async function parish() {
    const owner = await createHousehold(db, { name: "St. Anne’s" });
    const customer = id("cus");
    await db.update(households).set({ stripeCustomerId: customer }).where(eq(households.id, owner.id));
    const subId = id("sub");
    await applyStripeEvent(db, subEvent("customer.subscription.created", subscription({ id: subId, customer, status: "active", price: "price_parish" })));
    const coop = (await coopFor(db, await get(owner.id)))!;
    return { owner, coop, customer, subId };
  }

  it("creates a co-op with an invite code when the parish plan starts", async () => {
    const { owner, coop } = await parish();
    expect(coop).toMatchObject({ owned: true, members: 1, maxHouseholds: 25 });
    expect(coop.inviteCode).toMatch(/^[A-Z2-9]{8}$/);
    expect((await get(owner.id)).plan).toBe("parish");
  });

  it("lets families join with the code, up to the limit, and leave", async () => {
    const { coop } = await parish();
    const fam = await createHousehold(db, { name: "Family" });
    await joinCoop(db, fam.id, coop.inviteCode.toLowerCase().replace(/(.{4})/, "$1-"));
    expect((await coopFor(db, await get(fam.id)))).toMatchObject({ owned: false, members: 2 });
    await leaveCoop(db, fam.id);
    expect((await get(fam.id)).coopId).toBeNull();

    await db.update((await import("@/db/schema")).coops).set({ maxHouseholds: 2 }).where(eq((await import("@/db/schema")).coops.id, coop.id));
    const a = await createHousehold(db, { name: "A" });
    const b = await createHousehold(db, { name: "B" });
    await joinCoop(db, a.id, coop.inviteCode);
    await expect(joinCoop(db, b.id, coop.inviteCode)).rejects.toThrow(/full/);
  });

  it("refuses a wrong code and a lapsed parish plan", async () => {
    const { coop, customer, subId } = await parish();
    const fam = await createHousehold(db, { name: "Family 2" });
    await expect(joinCoop(db, fam.id, "NOPE1234")).rejects.toThrow(/doesn’t match/);
    // An event about some other subscription is ignored while this one is open…
    await applyStripeEvent(db, subEvent("customer.subscription.updated", subscription({ customer, status: "canceled", price: "price_parish" })));
    await joinCoop(db, fam.id, coop.inviteCode);
    await leaveCoop(db, fam.id);
    // …but this subscription lapsing closes the co-op to new families.
    await applyStripeEvent(db, subEvent("customer.subscription.updated", subscription({ id: subId, customer, status: "canceled", price: "price_parish" })));
    await expect(joinCoop(db, fam.id, coop.inviteCode)).rejects.toThrow(/isn’t active/);
  });

  it("makes readable invite codes", () => {
    expect(inviteCode()).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
  });
});
