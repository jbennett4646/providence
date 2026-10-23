import type { Metadata } from "next";
import Link from "next/link";
import { Screen } from "@/components/Screen";
import { cx, ui } from "@/components/ui/Controls";
import { getDb } from "@/db/client";
import { PLANS, subscriptionOpen } from "@/lib/domain/billing";
import { billingEnabled } from "@/server/billing/stripe";
import { coopFor } from "@/server/billing/subscriptions";
import { householdHasAccess, requireParent } from "@/server/session";
import { JoinCoopForm, LeaveCoop, ManageButton, SubscribeButton } from "./client";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Plan and billing" };

const STATUS: Record<string, string> = {
  active: "Active",
  trialing: "Free trial",
  past_due: "Payment overdue",
  unpaid: "Unpaid",
  canceled: "Cancelled",
  incomplete: "Waiting for payment",
  incomplete_expired: "Expired",
  paused: "Paused",
};

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ done?: string }> }) {
  const sp = await searchParams;
  const { household: h } = await requireParent();
  const enabled = billingEnabled();
  const access = await householdHasAccess(h);
  const coop = await coopFor(await getDb(), h);
  const open = subscriptionOpen(h.subscriptionStatus);
  const until = h.currentPeriodEnd ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(h.currentPeriodEnd) : null;

  return (
    <Screen label="Billing">
      <div className={styles.wrap}>
        {h.onboardedAt && (
          <Link href="/parent" className={ui.back}>
            ← Dashboard
          </Link>
        )}
        <div className={ui.kicker}>{h.name}</div>
        <h1 className={styles.title}>Plan and billing</h1>
        <p className={styles.lede}>Per household, not per child. Cancel in any month.</p>

        {sp.done && !open && <p className={styles.note}>Thank you. Stripe is confirming the payment; this page updates within a minute.</p>}

        {!enabled && (
          <div className={cx(ui.card, styles.box)}>
            <div className={styles.boxTitle}>Billing isn’t switched on yet</div>
            <p className={styles.muted}>
              Everything is open while the academy sets up payments. Nothing is charged. {h.onboardedAt && <Link href="/parent">Go to the dashboard</Link>}
            </p>
          </div>
        )}

        {enabled && h.subscriptionStatus && (
          <div className={cx(ui.card, styles.box)}>
            <div className={styles.boxHead}>
              <span className={styles.boxTitle}>{h.plan ? PLANS[h.plan].name : "Your plan"}</span>
              <span className={cx(styles.badge, open ? styles.badgeOk : styles.badgeWarn)}>{STATUS[h.subscriptionStatus] ?? h.subscriptionStatus}</span>
            </div>
            <p className={styles.muted}>
              {open && until && (h.cancelAtPeriodEnd ? `Cancelled; open until ${until}.` : `Renews ${until}.`)}
              {!open && "The plan isn’t active. Choose a plan below to open the app again; your records are kept."}
            </p>
            <ManageButton />
          </div>
        )}

        {coop && (
          <div className={cx(ui.card, styles.box)}>
            <div className={styles.boxHead}>
              <span className={styles.boxTitle}>{coop.owned ? "Your parish or co-op" : `Covered by ${coop.name}`}</span>
              <span className={styles.metaSmall}>
                {coop.members} of {coop.maxHouseholds} households
              </span>
            </div>
            {coop.owned ? (
              <p className={styles.muted}>
                Families join with this invite code when they set up, or from their billing page: <span className={styles.code}>{coop.inviteCode}</span>
              </p>
            ) : (
              <>
                <p className={styles.muted}>Your household is covered by the parish or co-op’s plan.</p>
                <LeaveCoop />
              </>
            )}
          </div>
        )}

        {enabled && !access && (
          <>
            <div className={styles.plans}>
              {(["household", "parish"] as const).map((id) => (
                <div key={id} className={cx(ui.card, styles.plan)}>
                  <div className={styles.planName}>{PLANS[id].name}</div>
                  <div className={styles.planPrice}>
                    ${PLANS[id].price}
                    <span>/month</span>
                  </div>
                  <p className={styles.muted}>{PLANS[id].blurb}</p>
                  <SubscribeButton plan={id} />
                </div>
              ))}
              <div className={cx(styles.plan, styles.planSoon)}>
                <div className={styles.planName}>Academy + Tutoring</div>
                <div className={styles.planPrice}>Pricing to come</div>
                <p className={styles.muted}>Everything in the household plan, with tutoring credits for one-to-one sessions.</p>
              </div>
            </div>
            {!coop && (
              <div className={cx(ui.card, styles.box)}>
                <div className={styles.boxTitle}>Part of a parish or co-op?</div>
                <p className={styles.muted}>If your parish or co-op is on the parish plan, enter its invite code and your household is covered.</p>
                <JoinCoopForm />
              </div>
            )}
          </>
        )}
      </div>
    </Screen>
  );
}
