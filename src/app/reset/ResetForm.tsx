"use client";

import { useActionState } from "react";
import { resetPassword, type FormState } from "@/app/auth-actions";
import styles from "@/components/auth/Auth.module.css";
import { Field } from "@/components/auth/Field";
import { cx, ui } from "@/components/ui/Controls";

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(resetPassword, {});
  return (
    <form action={action} className={cx(ui.card, styles.form)}>
      <input type="hidden" name="token" value={token} />
      <Field label="New password" name="password" type="password" autoComplete="new-password" required minLength={10} hint="At least 10 characters." />
      {state.error && <p className={styles.error}>{state.error}</p>}
      <div className={styles.actions}>
        <button type="submit" className={cx(ui.btn, ui.dark)} disabled={pending}>
          Set the password
        </button>
      </div>
    </form>
  );
}
