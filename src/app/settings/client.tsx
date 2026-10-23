"use client";

import { useActionState, useState, useTransition } from "react";
import { addChild, removeChild, setMode, updateChild, updateHousehold, type FormState } from "@/app/actions";
import { changePassword, removeStudentLogin, setStudentLogin } from "@/app/auth-actions";
import { cx, ui } from "@/components/ui/Controls";
import { gradeLabel } from "@/lib/domain/grades";
import styles from "./page.module.css";

const STATES = "AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY".split(" ");

function Saved({ state }: { state: FormState }) {
  if (state.error) return <span className={styles.error}>{state.error}</span>;
  if (state.ok) return <span className={styles.saved}>Saved</span>;
  return null;
}

export function HouseholdForm({ name, state }: { name: string; state: string }) {
  const [s, action, pending] = useActionState<FormState, FormData>(updateHousehold, {});
  return (
    <form action={action} className={styles.form}>
      <label className={styles.field}>
        <span className={styles.label}>Name</span>
        <input className={ui.input} name="name" defaultValue={name} maxLength={80} required />
      </label>
      <label className={styles.fieldNarrow}>
        <span className={styles.label}>State</span>
        <select className={ui.input} name="state" defaultValue={state}>
          {STATES.map((st) => (
            <option key={st} value={st}>
              {st}
            </option>
          ))}
        </select>
      </label>
      <div className={styles.formEnd}>
        <button type="submit" className={cx(ui.btn, ui.dark)} disabled={pending}>
          Save
        </button>
        <Saved state={s} />
      </div>
      {state !== "GA" && <p className={styles.hint}>State reporting covers Georgia for now. Your record is kept the same way; tell us your state and we’ll add its rules.</p>}
    </form>
  );
}

type ChildFormProps = { id: string; name: string; grade: string; mode: "screen" | "paper"; priorDays: number; canRemove: boolean };

export function ChildForm({ id, name, grade, mode, priorDays, canRemove }: ChildFormProps) {
  const [s, action, pending] = useActionState<FormState, FormData>(updateChild.bind(null, id), {});
  const [busy, start] = useTransition();
  return (
    <form action={action} className={cx(styles.form, styles.child)}>
      <label className={styles.field}>
        <span className={styles.label}>Name · {grade}</span>
        <input className={ui.input} name="name" defaultValue={name} maxLength={40} required />
      </label>
      <label className={styles.fieldNarrow}>
        <span className={styles.label}>Days taught before joining</span>
        <input className={ui.input} type="number" name="priorDays" min={0} max={180} defaultValue={priorDays} />
      </label>
      <div className={styles.fieldNarrow}>
        <span className={styles.label}>Teaching</span>
        <div className={ui.segmented}>
          {(["screen", "paper"] as const).map((m) => (
            <button key={m} type="button" disabled={busy} className={cx(ui.segment, mode === m && ui.segmentOn)} aria-pressed={mode === m} onClick={() => mode !== m && start(() => setMode(id, m))}>
              {m === "screen" ? "On screen" : "On paper"}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.formEnd}>
        <button type="submit" className={cx(ui.btn, ui.outline)} disabled={pending}>
          Save
        </button>
        {canRemove && (
          <button
            type="button"
            className={ui.quiet}
            disabled={busy}
            onClick={() => {
              if (window.confirm(`Remove ${name} and every record kept for them? This can't be undone.`)) start(() => removeChild(id));
            }}
          >
            Remove
          </button>
        )}
        <Saved state={s} />
      </div>
    </form>
  );
}

export function AddChildForm() {
  const [s, action, pending] = useActionState<FormState, FormData>(addChild, {});
  const [key, setKey] = useState(0);
  return (
    <form
      key={key}
      action={async (f) => {
        await action(f);
        setKey((k) => k + 1);
      }}
      className={styles.form}
    >
      <label className={styles.field}>
        <span className={styles.label}>Name</span>
        <input className={ui.input} name="name" maxLength={40} required />
      </label>
      <label className={styles.fieldNarrow}>
        <span className={styles.label}>Grade</span>
        <select className={ui.input} name="grade" defaultValue={3}>
          {Array.from({ length: 13 }, (_, g) => (
            <option key={g} value={g}>
              {gradeLabel(g)}
            </option>
          ))}
        </select>
      </label>
      <label className={styles.fieldNarrow}>
        <span className={styles.label}>Teaching</span>
        <select className={ui.input} name="mode" defaultValue="screen">
          <option value="screen">On screen</option>
          <option value="paper">On paper</option>
        </select>
      </label>
      <div className={styles.formEnd}>
        <button type="submit" className={cx(ui.btn, ui.dark)} disabled={pending}>
          Add the child
        </button>
        <Saved state={s} />
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [s, action, pending] = useActionState<FormState, FormData>(changePassword, {});
  return (
    <form action={action} className={styles.form}>
      <label className={styles.field}>
        <span className={styles.label}>Current password</span>
        <input className={ui.input} type="password" name="current" autoComplete="current-password" required />
      </label>
      <label className={styles.field}>
        <span className={styles.label}>New password</span>
        <input className={ui.input} type="password" name="next" autoComplete="new-password" minLength={10} required />
      </label>
      <div className={styles.formEnd}>
        <button type="submit" className={cx(ui.btn, ui.outline)} disabled={pending}>
          Change password
        </button>
        <Saved state={s} />
      </div>
    </form>
  );
}

export function StudentLoginForm({ childId, name, username }: { childId: string; name: string; username: string | null }) {
  const [s, action, pending] = useActionState<FormState, FormData>(setStudentLogin.bind(null, childId), {});
  const [busy, start] = useTransition();
  return (
    <form action={action} className={cx(styles.form, styles.child)}>
      <label className={styles.field}>
        <span className={styles.label}>{name} · username</span>
        <input className={ui.input} name="username" defaultValue={username ?? ""} maxLength={32} required autoComplete="off" />
      </label>
      <label className={styles.field}>
        <span className={styles.label}>{username ? "New password" : "Password"}</span>
        <input className={ui.input} type="password" name="password" minLength={10} required autoComplete="new-password" />
      </label>
      <div className={styles.formEnd}>
        <button type="submit" className={cx(ui.btn, ui.outline)} disabled={pending}>
          {username ? "Update login" : "Create login"}
        </button>
        {username && (
          <button type="button" className={ui.quiet} disabled={busy} onClick={() => window.confirm(`Remove ${name}'s login?`) && start(() => removeStudentLogin(childId))}>
            Remove login
          </button>
        )}
        <Saved state={s} />
      </div>
    </form>
  );
}
