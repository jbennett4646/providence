import type Stripe from "stripe";
import { getDb } from "@/db/client";
import { billingEnabled, stripe } from "@/server/billing/stripe";
import { applyStripeEvent } from "@/server/billing/subscriptions";

/** Stripe calls this for subscription changes. Configure it at /api/stripe/webhook. */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!billingEnabled() || !secret) return new Response("Billing is not configured", { status: 503 });
  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("Missing signature", { status: 400 });
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await req.text(), sig, secret);
  } catch {
    return new Response("Bad signature", { status: 400 });
  }
  await applyStripeEvent(await getDb(), event);
  return Response.json({ received: true });
}
