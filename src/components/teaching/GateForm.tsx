"use client";

import { useState, useTransition } from "react";
import { recordTermCheck } from "@/app/actions";
import { cx, Tick, ui } from "@/components/ui/Controls";
import { gatePasses, gateTotal } from "@/lib/domain/course";
import { gateOutcomeLine } from "@/lib/domain/transitions";
import type { GateSpec } from "@/server/teaching";
import styles from "./Teaching.module.css";

type GateFormProps = {
  childId: string;
  gate: GateSpec;
  /** The button that opens the form. */
  openLabel?: string;
  openClass?: string;
};

/** The term check: score (or parts), chants, the review tick, then Record. */
export function GateForm({ childId, gate, openLabel = "Record the term check", openClass }: GateFormProps) {
  const { info } = gate;
  const [open, setOpen] = useState(false);
  const [score, setScore] = useState(info.threshold);
  const [parts, setParts] = useState(info.parts?.map((p) => p.std) ?? []);
  const [chants, setChants] = useState(false);
  const [review, setReview] = useState(false);
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <button type="button" className={openClass ?? cx(ui.btn, ui.deep, ui.mid)} onClick={() => setOpen(true)}>
        {openLabel}
      </button>
    );
  }

  const input = { score, parts, chants };
  const pass = gatePasses(info, input);
  const total = gateTotal(info, input);
  const step = (i: number, d: number) =>
    setParts((a) => a.map((v, j) => (j === i ? Math.max(0, Math.min(info.parts![i].of, v + d)) : v)));

  return (
    <div className={styles.gate}>
      <div className={styles.gateTitle}>{gate.title}</div>
      <div className={styles.gateRule}>{gate.rule}</div>
      <button type="button" className={ui.checkRow} onClick={() => setReview((v) => !v)} aria-pressed={review}>
        <Tick on={review} />
        <span>{gate.reviewLabel}</span>
      </button>
      {info.parts ? (
        <>
          {info.parts.map((p, i) => (
            <div key={i} className={styles.gatePart}>
              <div className={styles.gatePartLabel}>
                <div>{p.label}</div>
                <div className={styles.gateStd}>standard {p.std}</div>
              </div>
              <button type="button" className={ui.stepper} aria-label="Less" onClick={() => step(i, -1)}>
                −
              </button>
              <span className={cx(styles.gateVal, parts[i] < p.std && styles.gateLow)}>
                {parts[i]} of {p.of}
              </span>
              <button type="button" className={ui.stepper} aria-label="More" onClick={() => step(i, 1)}>
                +
              </button>
            </div>
          ))}
          <div className={styles.gateTotal}>
            Total {total} of {info.of} · standard {info.threshold}
          </div>
        </>
      ) : (
        info.scored && (
          <div className={styles.gatePart}>
            <span className={styles.gateScoreLabel}>Score</span>
            <button type="button" className={ui.stepper} aria-label="Less" onClick={() => setScore((v) => Math.max(0, v - 1))}>
              −
            </button>
            <span className={styles.gateScore}>
              {score} of {info.of}
            </span>
            <button type="button" className={ui.stepper} aria-label="More" onClick={() => setScore((v) => Math.min(info.of, v + 1))}>
              +
            </button>
          </div>
        )
      )}
      {info.chants && (
        <button type="button" className={ui.checkRow} onClick={() => setChants((v) => !v)} aria-pressed={chants}>
          <Tick on={chants} />
          <span>The chants were said perfectly, aloud</span>
        </button>
      )}
      <div className={styles.gateActions}>
        <button
          type="button"
          className={cx(ui.btn, ui.mid, review ? ui.deep : ui.inactive)}
          disabled={!review || pending}
          onClick={() =>
            start(() =>
              recordTermCheck(childId, gate.grade, gate.courseId, gate.term, {
                score: info.parts ? undefined : score,
                parts: info.parts ? parts : undefined,
                chants,
              }),
            )
          }
        >
          Record
        </button>
        <button type="button" className={ui.quiet} onClick={() => setOpen(false)}>
          Cancel
        </button>
        <span className={styles.gateOutcome}>{gateOutcomeLine(info, gate.term, pass, review, gate.gradeLabel)}</span>
      </div>
    </div>
  );
}
