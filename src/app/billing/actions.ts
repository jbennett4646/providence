"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import type { PlanId } from "@/lib/domain/billing";
import { billingEnabled, stripe } from "@/server/billing/stripe";
import { checkoutUrl, CoopError, joinCoop as joinCoopDb, leaveCoop as leaveCoopDb, portalUrl } from "@/server/billing/subscriptions";
import { origin } from "@/server/origin";
import { requireParent } from "@/server/session";

export type StripeState = { error?: string };

const STRIPE_DOWN = "We couldn’t reach Stripe just now. Nothing was charged; try again in a minute.";

export async function subscribe(plan: PlanId): Promise<StripeState> {
  const { household } = await requireParent();
  if (!billingEnabled()) redirect("/billing");
  let url: string;
  try {
    url = await checkoutUrl(await getDb(), stripe(), household, plan === "parish" ? "parish" : "household", await origin());
  } catch (e) {
    console.error("Stripe checkout failed", e);
    return { error: STRIPE_DOWN };
  }
  redirect(url);
}

export async function manageBilling(): Promise<StripeState> {
  const { household } = await requireParent();
  if (!billingEnabled()) redirect("/billing");
  let url: string;
  try {
    url = await portalUrl(await getDb(), stripe(), household, await origin());
  } catch (e) {
    console.error("Stripe portal failed", e);
    return { error: STRIPE_DOWN };
  }
  redirect(url);
}

export type CoopState = { error?: string; ok?: boolean };

export async function joinCoop(_prev: CoopState, form: FormData): Promise<CoopState> {
  const { household } = await requireParent();
  try {
    await joinCoopDb(await getDb(), household.id, String(form.get("code") ?? ""));
  } catch (e) {
    if (e instanceof CoopError) return { error: e.message };
    throw e;
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function leaveCoop() {
  const { household } = await requireParent();
  await leaveCoopDb(await getDb(), household.id);
  revalidatePath("/", "layout");
}
