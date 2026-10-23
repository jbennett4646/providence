/*
 * Create the two plans in your Stripe account (test or live, by the key) and
 * print the environment variables to set.
 *
 *   STRIPE_SECRET_KEY=sk_test_… npm run stripe:setup
 *
 * Safe to re-run: it reuses prices it already made (found by lookup key).
 */
import Stripe from "stripe";

const PLANS = [
  { lookup: "pha_household_monthly", env: "STRIPE_PRICE_HOUSEHOLD", name: "Providence Home Academy — Household", amount: 10000 },
  { lookup: "pha_parish_monthly", env: "STRIPE_PRICE_PARISH", name: "Providence Home Academy — Parish & co-op", amount: 50000 },
];

async function main() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Set STRIPE_SECRET_KEY first (a test key starts sk_test_).");
  const stripe = new Stripe(key);
  const lines: string[] = [];
  for (const p of PLANS) {
    const found = await stripe.prices.list({ lookup_keys: [p.lookup], limit: 1 });
    let price = found.data[0];
    if (!price) {
      const product = await stripe.products.create({ name: p.name });
      price = await stripe.prices.create({
        product: product.id,
        currency: "usd",
        unit_amount: p.amount,
        recurring: { interval: "month" },
        lookup_key: p.lookup,
      });
    }
    lines.push(`${p.env}=${price.id}`);
  }
  console.log("Add these to your environment:\n");
  console.log(lines.join("\n"));
  console.log(
    "\nThen add a webhook endpoint in Stripe (Developers → Webhooks) pointing to <your site>/api/stripe/webhook," +
      "\nsending checkout.session.completed and customer.subscription.* events, and set STRIPE_WEBHOOK_SECRET to its signing secret.",
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
