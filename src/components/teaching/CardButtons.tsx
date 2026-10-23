"use client";

import { useTransition } from "react";
import { clearEntry, recordItem, reviewWeekDone, undoEntry } from "@/app/actions";
import { cx, ui } from "@/components/ui/Controls";
import type { RecordInput } from "@/server/mutations";
import type { TeachingCard } from "@/server/teaching";
import { GateForm } from "./GateForm";
import styles from "./Teaching.module.css";

/** "Done, went well" and "Needs another day" on a full card. */
export function RecordButtons({ childId, input }: { childId: string; input: Omit<RecordInput, "outcome"> }) {
  const [pending, start] = useTransition();
  return (
    <>
      <button
        type="button"
        className={cx(ui.btn, ui.paper, ui.mid)}
        disabled={pending}
        onClick={() => start(() => recordItem(childId, { ...input, outcome: "well" }))}
      >
        Done, went well
      </button>
      <button
        type="button"
        className={cx(ui.btn, ui.paper, ui.paperDeep, ui.mid)}
        disabled={pending}
        onClick={() => start(() => recordItem(childId, { ...input, outcome: "again" }))}
      >
        Needs another day
      </button>
    </>
  );
}

/** The next step and Undo on a compact card. */
export function CompactActions({ childId, card }: { childId: string; card: TeachingCard }) {
  const [pending, start] = useTransition();
  const next = card.next;
  return (
    <>
      <div className={styles.compactActions}>
        {next && next.action.kind !== "gate" && (
          <button
            type="button"
            className={cx(ui.btn, ui.dark, ui.mid)}
            disabled={pending}
            onClick={() =>
              start(async () => {
                const a = next.action;
                if (a.kind === "clear") await clearEntry(childId, a.courseId, a.lane);
                else if (a.kind === "review") await reviewWeekDone(childId, a.grade, a.courseId);
              })
            }
          >
            {next.label}
          </button>
        )}
        {card.undo && (
          <button
            type="button"
            className={ui.quiet}
            disabled={pending}
            onClick={() => start(() => undoEntry(childId, card.undo!.courseId, card.undo!.lane))}
          >
            Undo
          </button>
        )}
      </div>
      {next?.action.kind === "gate" && (
        <div className={styles.compactGate}>
          <GateForm childId={childId} gate={next.action.gate} openLabel={next.label} openClass={cx(ui.btn, ui.dark, ui.mid)} />
        </div>
      )}
    </>
  );
}
