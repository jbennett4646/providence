"use client";

import { useActionState, useState, useTransition } from "react";
import { cx, ui } from "@/components/ui/Controls";
import { markFiled, saveDetails, saveReportNote, unmarkFiled, type DetailsState } from "./actions";
import styles from "./page.module.css";

type Details = {
  parentName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  county: string;
  postalCode: string;
  phone: string;
  state: string;
  children: { id: string; name: string; birthDate: string }[];
};

export function DetailsForm({ d }: { d: Details }) {
  const [state, action, pending] = useActionState<DetailsState, FormData>(saveDetails, {});
  const input = (name: keyof Details, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      <input className={ui.input} name={name} defaultValue={d[name] as string} {...props} />
    </label>
  );
  return (
    <form action={action} className={styles.form}>
      {input("parentName", "Instructing parent", { maxLength: 80, autoComplete: "name" })}
      {input("addressLine1", "Street address", { maxLength: 120, autoComplete: "address-line1" })}
      {input("addressLine2", "Address, line 2 (optional)", { maxLength: 120, autoComplete: "address-line2" })}
      <div className={styles.row3}>
        {input("city", "City", { maxLength: 60, autoComplete: "address-level2" })}
        <label className={styles.field}>
          <span className={styles.label}>State</span>
          <input className={ui.input} value={d.state} disabled aria-readonly />
        </label>
        {input("postalCode", "ZIP", { maxLength: 10, inputMode: "numeric", autoComplete: "postal-code" })}
      </div>
      <div className={styles.row2}>
        {input("county", "County", { maxLength: 60 })}
        {input("phone", "Telephone", { maxLength: 30, autoComplete: "tel", type: "tel" })}
      </div>
      {d.children.length > 0 && <div className={styles.label}>Dates of birth</div>}
      {d.children.map((c) => (
        <label key={c.id} className={styles.birth}>
          <span>{c.name}</span>
          <input className={cx(ui.input, styles.birthInput)} type="date" name={`birth:${c.id}`} defaultValue={c.birthDate} />
        </label>
      ))}
      <div className={styles.actions}>
        <button type="submit" className={cx(ui.btn, ui.dark)} disabled={pending}>
          Save the details
        </button>
        {state.ok && <span className={styles.saved}>Saved</span>}
        {state.error && <span className={styles.error}>{state.error}</span>}
      </div>
    </form>
  );
}

export function FiledControl({ filedOn, today }: { filedOn: string | null; today: string }) {
  const [date, setDate] = useState(today);
  const [pending, start] = useTransition();
  if (filedOn)
    return (
      <div className={styles.filed}>
        <span>Filed {filedOn}.</span>
        <button type="button" className={ui.quiet} disabled={pending} onClick={() => start(() => unmarkFiled())}>
          Not filed after all
        </button>
      </div>
    );
  return (
    <div className={styles.filed}>
      <span>Filed it?</span>
      <input className={cx(ui.input, styles.birthInput)} type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} aria-label="Date filed" />
      <button type="button" className={cx(ui.btn, ui.outline, ui.small)} disabled={pending || !date} onClick={() => start(() => markFiled(date))}>
        Record the date
      </button>
    </div>
  );
}

/** One subject's assessment, saved when the box loses focus. */
export function SubjectNote({ childId, subject, initial }: { childId: string; subject: string; initial: string }) {
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [pending, start] = useTransition();
  return (
    <div className={styles.noteWrap}>
      <textarea
        className={cx(ui.input, styles.note)}
        value={value}
        rows={3}
        maxLength={4000}
        placeholder={`How ${subject.toLowerCase()} went this year, in your own words.`}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => value !== saved && start(async () => {
          await saveReportNote(childId, subject, value);
          setSaved(value);
        })}
        aria-label={`${subject} assessment`}
      />
      <span className={styles.noteState}>{pending ? "Saving…" : value === saved ? (saved ? "Saved" : "") : "Not saved yet"}</span>
    </div>
  );
}
