"use client";

import { useState, useTransition } from "react";
import { readinessWeekDone, recordReadiness, setTestDate, undoReadiness } from "@/app/actions";
import { cx, ui } from "@/components/ui/Controls";
import styles from "./Teaching.module.css";

/** "Done" on today's practice session. */
export function PracticeDone({ childId, session }: { childId: string; session: number }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" className={cx(ui.btn, ui.paper, ui.mid)} disabled={pending} onClick={() => start(() => recordReadiness(childId, session))}>
      Done
    </button>
  );
}

export function PracticeUndo({ childId, session }: { childId: string; session: number }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" className={ui.quiet} disabled={pending} onClick={() => start(() => undoReadiness(childId, session))}>
      Undo
    </button>
  );
}

/** Paper check-in: the practice week is done. */
export function PracticeWeekDone({ childId, week }: { childId: string; week: 34 | 35 }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" className={cx(ui.btn, ui.green, ui.mid)} disabled={pending} onClick={() => start(() => readinessWeekDone(childId, week))}>
      Week {week} done
    </button>
  );
}

/** The day the test was given: recorded once, changeable. Only the date; scores stay with the family. */
export function TestDateControl({ childId, givenOn, givenLabel, today }: { childId: string; givenOn: string | null; givenLabel: string; today: string }) {
  const [date, setDate] = useState(givenOn ?? today);
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  if (givenOn && !editing)
    return (
      <div className={styles.testDate}>
        <span>Given {givenLabel}.</span>
        <button type="button" className={ui.quiet} disabled={pending} onClick={() => setEditing(true)}>
          Change
        </button>
        <button type="button" className={ui.quiet} disabled={pending} onClick={() => start(() => setTestDate(childId, null))}>
          Not given after all
        </button>
      </div>
    );
  return (
    <div className={styles.testDate}>
      <span>Given the test?</span>
      <input className={cx(ui.input, styles.testDateInput)} type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} aria-label="Date the test was given" />
      <button
        type="button"
        className={cx(ui.btn, ui.outline, ui.small)}
        disabled={pending || !date}
        onClick={() =>
          start(async () => {
            await setTestDate(childId, date);
            setEditing(false);
          })
        }
      >
        Record the date
      </button>
    </div>
  );
}
