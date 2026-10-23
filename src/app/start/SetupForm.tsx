"use client";

import { useActionState, useState } from "react";
import { setUpHousehold, type SetupState } from "@/app/actions";
import { cx, ui } from "@/components/ui/Controls";
import { gradeLabel } from "@/lib/domain/grades";
import styles from "./page.module.css";

const GRADES = Array.from({ length: 13 }, (_, g) => g);

export function SetupForm({ today, loadedGrades }: { today: string; loadedGrades: number[] }) {
  const [state, action, pending] = useActionState<SetupState, FormData>(setUpHousehold, {});
  const [grade, setGrade] = useState(3);
  const [mode, setMode] = useState<"screen" | "paper">("screen");
  return (
    <form action={action} className={cx(ui.card, styles.form)}>
      <label className={styles.field}>
        <span className={styles.label}>Household</span>
        <input className={ui.input} name="household" placeholder="e.g. The Hartwell Family" required maxLength={80} />
      </label>
      <div className={styles.row}>
        <label className={styles.field}>
          <span className={styles.label}>Child’s name</span>
          <input className={ui.input} name="child" required maxLength={40} />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Grade</span>
          <select className={ui.input} name="grade" value={grade} onChange={(e) => setGrade(Number(e.target.value))}>
            {GRADES.map((g) => (
              <option key={g} value={g}>
                {gradeLabel(g)}
              </option>
            ))}
          </select>
        </label>
      </div>
      {!loadedGrades.includes(grade) && (
        <p className={styles.note}>
          {gradeLabel(grade)} manuals aren’t loaded yet. You can still set up the household; the courses appear once they
          are. {loadedGrades.map(gradeLabel).join(", ")} is ready now.
        </p>
      )}
      <div className={styles.row}>
        <label className={styles.field}>
          <span className={styles.label}>First day of school</span>
          <input className={ui.input} type="date" name="start" defaultValue={today} required />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Days already taught this year</span>
          <input className={ui.input} type="number" name="priorDays" min={0} max={180} defaultValue={0} />
        </label>
      </div>
      <p className={styles.hint}>
        Joining midyear? The year starts on your first day here. Enter any school days already taught elsewhere so the
        180-day count is right.
      </p>
      <div className={styles.field}>
        <span className={styles.label}>How will you teach?</span>
        <input type="hidden" name="mode" value={mode} />
        <div className={styles.modes}>
          <button type="button" className={cx(styles.mode, mode === "screen" && styles.modeOn)} onClick={() => setMode("screen")} aria-pressed={mode === "screen"}>
            <span className={styles.modeKicker}>On screen</span>
            <span className={styles.modeTitle}>Teach from the day’s page</span>
            <span className={styles.modeBody}>Each morning’s drill and task appear with the manual text. You record each one as you go.</span>
          </button>
          <button type="button" className={cx(styles.mode, mode === "paper" && styles.modeOn)} onClick={() => setMode("paper")} aria-pressed={mode === "paper"}>
            <span className={styles.modeKicker}>On paper</span>
            <span className={styles.modeTitle}>Print the manuals, keep the screen away</span>
            <span className={styles.modeBody}>Print the year plan once and one term manual at a time. Once a week, tell us how the week went.</span>
          </button>
        </div>
      </div>
      {state.error && <p className={styles.error}>{state.error}</p>}
      <div>
        <button type="submit" className={cx(ui.btn, ui.dark)} disabled={pending}>
          {pending ? "Setting up…" : "Set up the household"}
        </button>
      </div>
    </form>
  );
}
