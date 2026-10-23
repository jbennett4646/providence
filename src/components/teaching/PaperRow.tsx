"use client";

import { useTransition } from "react";
import { carryOver, paperWeekDone, reviewWeekDone } from "@/app/actions";
import { cx, ui } from "@/components/ui/Controls";
import type { CheckinRow } from "@/server/teaching";
import { GateForm } from "./GateForm";
import { PrintLink } from "./PrintLink";
import styles from "./Teaching.module.css";

/** One course's weekly check-in in paper mode. */
export function PaperRow({ childId, row }: { childId: string; row: CheckinRow }) {
  const [pending, start] = useTransition();
  const done = () =>
    start(() => (row.state === "review" ? reviewWeekDone(childId, row.grade, row.courseId) : paperWeekDone(childId, row.grade, row.courseId, row.week)));
  return (
    <div className={styles.ckRow}>
      <div className={styles.ckMain}>
        <div className={styles.ckInfo}>
          <div className={styles.ckName}>{row.name}</div>
          <div className={styles.ckPos}>{row.pos}</div>
          {row.printDoc && (
            <div className={styles.ckPrint}>
              <span>{row.printNote}</span>
              <PrintLink childId={childId} docs={[row.printDoc]} className={ui.link}>
                {row.printLabel}
              </PrintLink>
            </div>
          )}
        </div>
        <div className={styles.ckActions}>
          {(row.state === "week" || row.state === "review") && (
            <>
              <button type="button" className={cx(ui.btn, ui.green, ui.mid)} disabled={pending} onClick={done}>
                {row.state === "review" ? "Review week done" : "Week done"}
              </button>
              <button type="button" className={cx(ui.btn, ui.paper, ui.paperDeep, ui.mid)} disabled={pending} onClick={() => start(() => carryOver(childId, row.grade, row.courseId))}>
                Carry over
              </button>
            </>
          )}
          {row.state === "complete" && <span className={styles.ckComplete}>{row.pos}</span>}
        </div>
      </div>
      {row.state === "gate" && row.gate && (
        <div className={styles.ckGate}>
          <GateForm childId={childId} gate={row.gate} />
        </div>
      )}
    </div>
  );
}
