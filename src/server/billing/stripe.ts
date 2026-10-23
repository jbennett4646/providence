import Stripe from "stripe";

/*
 * Stripe client and configuration. Billing is switched on by setting
 * STRIPE_SECRET_KEY; without it the app runs open, with no plan required.
 * See DEVELOPMENT.md for the keys and `npm run stripe:setup`.
 */

export function billingEnabled(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

let client: Stripe | undefined;

export function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  client ??= new Stripe(key, { appInfo: { name: "Providence Home Academy" } });
  return client;
}
