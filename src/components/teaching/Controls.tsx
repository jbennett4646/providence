"use client";

import { useTransition } from "react";
import { addExtra, removeExtra, setMode, setPause, togglePaperRoutine } from "@/app/actions";
import { cx, Tick, ui } from "@/components/ui/Controls";
import styles from "./Teaching.module.css";

export function ModeToggle({ childId, mode, name }: { childId: string; mode: "screen" | "paper"; name: string }) {
  const [pending, start] = useTransition();
  return (
    <div className={styles.modeRow}>
      <span className={styles.modeLabel}>{name} learns</span>
      <div className={ui.segmented}>
        {(["screen", "paper"] as const).map((m) => (
          <button
            key={m}
            type="button"
            className={cx(ui.segment, mode === m && ui.segmentOn)}
            aria-pressed={mode === m}
            disabled={pending}
            onClick={() => mode !== m && start(() => setMode(childId, m))}
          >
            {m === "screen" ? "On screen" : "On paper"}
          </button>
        ))}
      </div>
    </div>
  );
}

export function PrintPageButton() {
  return (
    <button type="button" className={cx(ui.btn, ui.dark, styles.printBtn)} onClick={() => window.print()}>
      Print today&apos;s page
    </button>
  );
}

export function PauseButtons({ childId, paused, canMark, canPause }: { childId: string; paused: boolean; canMark: boolean; canPause: boolean }) {
  const [pending, start] = useTransition();
  return (
    <>
      {canMark && canPause && (
        <>
          <button type="button" className={cx(ui.btn, ui.paper, ui.paperDeep, ui.small)} disabled={pending} onClick={() => start(() => setPause(childId, "sick"))}>
            Sick day
          </button>
          <button type="button" className={cx(ui.btn, ui.paper, ui.paperDeep, ui.small)} disabled={pending} onClick={() => start(() => setPause(childId, "travel"))}>
            Travel day
          </button>
        </>
      )}
      {paused && (
        <button type="button" className={ui.quiet} disabled={pending} onClick={() => start(() => setPause(childId, null))}>
          Undo pause
        </button>
      )}
    </>
  );
}

export function ExtraOptions({ childId, options }: { childId: string; options: { label: string; mins: number }[] }) {
  const [pending, start] = useTransition();
  return (
    <div className={styles.extraOpts}>
      {options.map((o) => (
        <button key={o.label} type="button" className={styles.extraOpt} disabled={pending} onClick={() => start(() => addExtra(childId, o.label))}>
          {o.label}
          <span className={styles.extraAdd}>+{o.mins} min</span>
        </button>
      ))}
    </div>
  );
}

export function RemoveExtra({ childId, index }: { childId: string; index: number }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" className={ui.quiet} disabled={pending} onClick={() => start(() => removeExtra(childId, index))}>
      Remove
    </button>
  );
}

export function PaperRoutineToggle({ childId, on }: { childId: string; on: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" className={cx(ui.checkRow, styles.paperRoutine)} disabled={pending} onClick={() => start(() => togglePaperRoutine(childId))} aria-pressed={on}>
      <Tick on={on} />
      <span>We did today’s routine from the booklets</span>
    </button>
  );
}
