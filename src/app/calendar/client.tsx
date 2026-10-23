"use client";

import { useState, useTransition } from "react";
import { addBreak, removeBreak, resetCalendar, setCalStart, setSchoolDays, toggleHolidayTeach } from "@/app/actions";
import { cx, ui } from "@/components/ui/Controls";
import { Switch } from "@/components/ui/Switch";
import styles from "./page.module.css";

export type Cell = {
  date: string;
  day: number;
  type: "before" | "rest" | "holiday" | "break" | "school" | "after";
  ends: boolean;
  today: boolean;
  holidayName: string | null;
  tip: string;
  title: string;
  note: string;
  action: { label: string; kind: "holiday" | "start" } | { label: string; kind: "break"; id: string } | null;
};

export type Month = { name: string; count: string; leading: number; cells: Cell[] };

/** The months of the school year, and a panel for the day picked. */
export function CalendarGrid({ months, initial }: { months: Month[]; initial: string }) {
  const [sel, setSel] = useState(initial);
  const [pending, start] = useTransition();
  const cell = months.flatMap((m) => m.cells).find((c) => c.date === sel) ?? months[0]?.cells[0];
  const act = () => {
    const a = cell?.action;
    if (!a || !cell) return;
    start(async () => {
      if (a.kind === "break") await removeBreak(a.id);
      else if (a.kind === "holiday") await toggleHolidayTeach(cell.date);
      else await setCalStart(cell.date);
    });
  };
  return (
    <div className={styles.main}>
      {cell && (
        <div className={styles.selected}>
          <div className={styles.selText}>
            <div className={styles.selTitle}>{cell.title}</div>
            <div className={styles.selNote}>{cell.note}</div>
          </div>
          {cell.action && (
            <button type="button" className={cx(ui.btn, ui.onDark, ui.small)} disabled={pending} onClick={act}>
              {cell.action.label}
            </button>
          )}
        </div>
      )}
      <div className={styles.months}>
        {months.map((m) => (
          <div key={m.name} className={cx(ui.card, styles.month)}>
            <div className={styles.monthHead}>
              <span className={styles.monthName}>{m.name}</span>
              <span className={styles.monthCount}>{m.count}</span>
            </div>
            <div className={styles.dow}>
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                <span key={i}>{d}</span>
              ))}
            </div>
            <div className={styles.grid}>
              {Array.from({ length: m.leading }, (_, i) => (
                <span key={`b${i}`} />
              ))}
              {m.cells.map((c) => (
                <button
                  key={c.date}
                  type="button"
                  title={c.tip}
                  onClick={() => setSel(c.date)}
                  className={cx(
                    styles.cell,
                    styles[c.type],
                    c.type === "school" && c.holidayName && styles.taughtHoliday,
                    c.ends && styles.ends,
                    c.today && styles.today,
                    c.date === sel && styles.sel,
                  )}
                  aria-pressed={c.date === sel}
                >
                  {c.day}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StartDate({ value }: { value: string }) {
  const [pending, start] = useTransition();
  return (
    <input
      type="date"
      className={ui.input}
      defaultValue={value}
      disabled={pending}
      onChange={(e) => {
        const v = e.target.value;
        if (/^\d{4}-\d{2}-\d{2}$/.test(v)) start(() => setCalStart(v));
      }}
    />
  );
}

export function SchoolDaysChoice({ value }: { value: "mf" | "ms" }) {
  const [pending, start] = useTransition();
  return (
    <div className={cx(ui.segmented, styles.segmented)}>
      {(["mf", "ms"] as const).map((k) => (
        <button key={k} type="button" disabled={pending} className={cx(ui.segment, value === k && ui.segmentOn)} aria-pressed={value === k} onClick={() => value !== k && start(() => setSchoolDays(k))}>
          {k === "mf" ? "Mon–Fri" : "Mon–Sat"}
        </button>
      ))}
    </div>
  );
}

export function HolidaySwitch({ date, name, off }: { date: string; name: string; off: boolean }) {
  return <Switch small on={off} label={`${name} is a day off`} onToggle={() => toggleHolidayTeach(date)} />;
}

export function BreakRemove({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" className={ui.quiet} disabled={pending} onClick={() => start(() => removeBreak(id))}>
      Remove
    </button>
  );
}

export function AddBreak() {
  const [label, setLabel] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [pending, start] = useTransition();
  const ok = !!(label.trim() && from && to && from <= to);
  return (
    <div className={styles.addBreak}>
      <input className={ui.input} type="text" placeholder="Name, e.g. Family trip" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={80} aria-label="Break name" />
      <div className={styles.dates}>
        <input
          className={ui.input}
          type="date"
          value={from}
          aria-label="First day of the break"
          onChange={(e) => {
            const v = e.target.value;
            setFrom(v);
            if (!to || to < v) setTo(v);
          }}
        />
        <input className={ui.input} type="date" value={to} aria-label="Last day of the break" onChange={(e) => setTo(e.target.value)} />
      </div>
      <button
        type="button"
        className={cx(ui.btn, ok ? ui.dark : ui.inactive)}
        disabled={!ok || pending}
        onClick={() =>
          start(async () => {
            await addBreak(label, from, to);
            setLabel("");
            setFrom("");
            setTo("");
          })
        }
      >
        Add the break
      </button>
    </div>
  );
}

export function ResetCalendar() {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className={cx(ui.quiet, styles.reset)}
      disabled={pending}
      onClick={() => {
        if (window.confirm("Put back the suggested breaks and make every federal holiday a day off again?")) start(() => resetCalendar());
      }}
    >
      Reset the calendar
    </button>
  );
}
