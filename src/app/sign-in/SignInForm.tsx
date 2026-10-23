"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn, type FormState } from "@/app/auth-actions";
import styles from "@/components/auth/Auth.module.css";
import { Field } from "@/components/auth/Field";
import { cx, ui } from "@/components/ui/Controls";

export function SignInForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(signIn, {});
  return (
    <form action={action} className={cx(ui.card, styles.form)}>
      <input type="hidden" name="next" value={next} />
      <Field label="Email or username" name="login" autoComplete="username" required maxLength={254} autoFocus defaultValue={state.values?.login} key={state.values?.login} />
      <Field label="Password" name="password" type="password" autoComplete="current-password" required />
      {state.error && <p className={styles.error}>{state.error}</p>}
      <div className={styles.actions}>
        <button type="submit" className={cx(ui.btn, ui.dark)} disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </button>
        <Link href="/forgot" className={ui.link}>
          Forgot your password?
        </Link>
      </div>
    </form>
  );
}
