"use client";

import { useActionState } from "react";
import { forgotPassword, type FormState } from "@/app/auth-actions";
import styles from "@/components/auth/Auth.module.css";
import { Field } from "@/components/auth/Field";
import { cx, ui } from "@/components/ui/Controls";

export function ForgotForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(forgotPassword, {});
  return (
    <form action={action} className={cx(ui.card, styles.form)}>
      <Field label="Email" name="email" type="email" autoComplete="email" required maxLength={254} />
      {state.error && <p className={styles.error}>{state.error}</p>}
      {state.ok && <p className={styles.ok}>{state.message}</p>}
      <div className={styles.actions}>
        <button type="submit" className={cx(ui.btn, ui.dark)} disabled={pending}>
          Send the link
        </button>
      </div>
    </form>
  );
}
