/*
 * Plans and who may use the app. One subscription covers a household (any
 * number of children); the parish plan covers up to 25 households.
 */

export type PlanId = "household" | "parish";

export const PLANS: Record<PlanId, { name: string; price: number; blurb: string; priceEnv: string }> = {
  household: {
    name: "Providence Home Academy",
    price: 100,
    blurb: "The whole platform, for the whole household.",
    priceEnv: "STRIPE_PRICE_HOUSEHOLD",
  },
  parish: {
    name: "Parish & co-op",
    price: 500,
    blurb: "For homeschool co-ops, churches and parish schools: up to 25 households.",
    priceEnv: "STRIPE_PRICE_PARISH",
  },
};

/** Stripe statuses that keep the app open. past_due gets the dunning grace period. */
const OPEN = new Set(["active", "trialing", "past_due"]);

export function subscriptionOpen(status: string | null | undefined): boolean {
  return !!status && OPEN.has(status);
}

export type AccessInput = {
  billingEnabled: boolean;
  status: string | null;
  /** The status of the subscription of the co-op this household belongs to, if any. */
  coopStatus?: string | null;
};

/** Whether the household may use the app. With billing not configured, everyone may. */
export function hasAccess({ billingEnabled, status, coopStatus }: AccessInput): boolean {
  return !billingEnabled || subscriptionOpen(status) || subscriptionOpen(coopStatus);
}

/** Which plan a Stripe price is, by the configured price ids. */
export function planForPrice(priceId: string | null | undefined, env: Record<string, string | undefined> = process.env): PlanId | null {
  if (!priceId) return null;
  for (const [id, p] of Object.entries(PLANS) as [PlanId, (typeof PLANS)[PlanId]][]) if (env[p.priceEnv] === priceId) return id;
  return null;
}
