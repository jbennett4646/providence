"use client";

import { useActionState, useState, useTransition } from "react";
import { cx, ui } from "@/components/ui/Controls";
import type { PlanId } from "@/lib/domain/billing";
import { joinCoop, leaveCoop, manageBilling, subscribe, type CoopState } from "./actions";
import styles from "./page.module.css";

export function SubscribeButton({ plan }: { plan: PlanId }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <>
      <button type="button" className={cx(ui.btn, ui.dark)} disabled={pending} onClick={() => start(async () => setError((await subscribe(plan))?.error))}>
        {pending ? "Opening Stripe…" : "Choose this plan"}
      </button>
      {error && <span className={styles.error}>{error}</span>}
    </>
  );
}

export function ManageButton() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <>
      <button type="button" className={cx(ui.btn, ui.outline)} disabled={pending} onClick={() => start(async () => setError((await manageBilling())?.error))}>
        Change card or cancel
      </button>
      {error && <span className={styles.error}>{error}</span>}
    </>
  );
}

export function JoinCoopForm() {
  const [state, action, pending] = useActionState<CoopState, FormData>(joinCoop, {});
  return (
    <form action={action} className={styles.join}>
      <input className={ui.input} name="code" placeholder="Invite code" maxLength={20} required aria-label="Invite code" />
      <button type="submit" className={cx(ui.btn, ui.outline)} disabled={pending}>
        Join
      </button>
      {state.error && <span className={styles.error}>{state.error}</span>}
    </form>
  );
}

export function LeaveCoop() {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className={ui.quiet}
      disabled={pending}
      onClick={() => window.confirm("Leave the parish or co-op? Your household will need its own plan.") && start(() => leaveCoop())}
    >
      Leave the parish or co-op
    </button>
  );
}
