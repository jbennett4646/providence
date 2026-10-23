"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { signUp, type FormState } from "@/app/auth-actions";
import styles from "@/components/auth/Auth.module.css";
import { Field } from "@/components/auth/Field";
import { cx, ui } from "@/components/ui/Controls";
import { gradeLabel } from "@/lib/domain/grades";
import { addChild, removeChild, saveCalendar, type StepState } from "./actions";
import own from "./page.module.css";

const STATES = "AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY".split(" ");

export function AccountForm({ invite }: { invite: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(signUp, {});
  const [st, setSt] = useState("GA");
  const v = state.values;
  return (
    <form action={action} className={cx(ui.card, styles.form)} key={v ? JSON.stringify(v) : "new"}>
      <Field label="Household" name="household" placeholder="e.g. The Hartwell Family" required maxLength={80} defaultValue={v?.household} />
      <div className={styles.row}>
        <Field label="Your email" name="email" type="email" autoComplete="email" required maxLength={254} defaultValue={v?.email} />
        <Field label="Password" name="password" type="password" autoComplete="new-password" required minLength={10} hint="At least 10 characters." />
      </div>
      <div className={styles.row}>
        <label className={styles.field}>
          <span className={styles.label}>State</span>
          <select className={ui.input} name="state" value={st} onChange={(e) => setSt(e.target.value)}>
            {STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {st !== "GA" && <span className={styles.hint}>Families anywhere may enroll. State reporting covers Georgia for now; tell us your state and we’ll add it.</span>}
        </label>
        <Field label="Parish or co-op invite code" name="invite" defaultValue={v?.invite ?? invite} maxLength={20} hint="Optional. From your parish or co-op, if it covers your household." />
      </div>
      {state.error && <p className={styles.error}>{state.error}</p>}
      <div className={styles.actions}>
        <button type="submit" className={cx(ui.btn, ui.dark)} disabled={pending}>
          {pending ? "Creating the account…" : "Create the account"}
        </button>
      </div>
    </form>
  );
}

export function AddChildForm() {
  const [state, action, pending] = useActionState<StepState, FormData>(addChild, {});
  const [key, setKey] = useState(0);
  return (
    <form
      key={key}
      action={async (f) => {
        await action(f);
        setKey((k) => k + 1);
      }}
      className={cx(ui.card, styles.form)}
    >
      <div className={styles.row}>
        <Field label="Child’s name" name="name" required maxLength={40} />
        <label className={styles.field}>
          <span className={styles.label}>Grade</span>
          <select className={ui.input} name="grade" defaultValue={3}>
            {Array.from({ length: 13 }, (_, g) => (
              <option key={g} value={g}>
                {gradeLabel(g)}
              </option>
            ))}
          </select>
          <span className={styles.hint}>Grade 3 manuals are loaded now; other grades follow.</span>
        </label>
      </div>
      {state.error && <p className={styles.error}>{state.error}</p>}
      <div className={styles.actions}>
        <button type="submit" className={cx(ui.btn, ui.outline)} disabled={pending}>
          Add the child
        </button>
      </div>
    </form>
  );
}

export function RemoveChild({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" className={ui.quiet} disabled={pending} onClick={() => start(() => removeChild(id))}>
      Remove
    </button>
  );
}

export function CalendarForm({ start, week, kids }: { start: string; week: "mf" | "ms"; kids: { id: string; name: string; prior: number }[] }) {
  const [state, action, pending] = useActionState<StepState, FormData>(saveCalendar, {});
  const [w, setW] = useState(week);
  return (
    <form action={action} className={cx(ui.card, styles.form)}>
      <div className={styles.row}>
        <Field label="First day of school" name="start" type="date" defaultValue={start} required />
        <div className={styles.field}>
          <span className={styles.label}>School week</span>
          <input type="hidden" name="week" value={w} />
          <div className={ui.segmented} style={{ alignSelf: "flex-start" }}>
            {(["mf", "ms"] as const).map((k) => (
              <button key={k} type="button" className={cx(ui.segment, w === k && ui.segmentOn)} aria-pressed={w === k} onClick={() => setW(k)}>
                {k === "mf" ? "Mon–Fri" : "Mon–Sat"}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className={styles.label}>School days already taught this year</div>
      {kids.map((k) => (
        <label key={k.id} className={own.priorRow}>
          <span>{k.name}</span>
          <input className={cx(ui.input, own.priorInput)} type="number" name={`prior:${k.id}`} min={0} max={180} defaultValue={k.prior} />
        </label>
      ))}
      {state.error && <p className={styles.error}>{state.error}</p>}
      <div className={styles.actions}>
        <Link href="/start?step=placement" className={ui.quiet}>
          Back
        </Link>
        <button type="submit" className={cx(ui.btn, ui.dark)} disabled={pending}>
          Continue
        </button>
      </div>
    </form>
  );
}

export function ModeChoice({ id, name, initial }: { id: string; name: string; initial: "screen" | "paper" }) {
  const [mode, setMode] = useState(initial);
  return (
    <div className={cx(ui.card, own.place)}>
      <div className={own.placeName}>{name}</div>
      <input type="hidden" name={`mode:${id}`} value={mode} />
      <div className={own.modes}>
        <button type="button" className={cx(own.mode, mode === "screen" && own.modeOn)} aria-pressed={mode === "screen"} onClick={() => setMode("screen")}>
          <span className={own.modeKicker}>On screen</span>
          <span className={own.modeTitle}>Teach from the day’s page</span>
          <span className={own.modeBody}>Each morning’s drill and task appear with the manual text, ready on a laptop or tablet. You record each one as you go.</span>
        </button>
        <button type="button" className={cx(own.mode, mode === "paper" && own.modeOn)} aria-pressed={mode === "paper"} onClick={() => setMode("paper")}>
          <span className={own.modeKicker}>On paper</span>
          <span className={own.modeTitle}>Print the manuals, keep the screen away</span>
          <span className={own.modeBody}>Print the year plan once and one term manual at a time. Once a week, tell us how the week went. At each term check, enter the score.</span>
        </button>
      </div>
    </div>
  );
}
