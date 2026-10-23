import Link from "next/link";
import { inline } from "@/components/guide/Rich";
import { cx, CheckMark, ui } from "@/components/ui/Controls";
import { fmtLong } from "@/lib/domain/dates";
import { READINESS_SESSIONS } from "@/lib/domain/readiness";
import { GUIDE_HREF, GUIDE_PDF_HREF, type ReadinessView } from "@/server/readiness";
import { PracticeDone, PracticeUndo, PracticeWeekDone, TestDateControl } from "./ReadinessControls";
import styles from "./Teaching.module.css";

/*
 * The Grade 3 test readiness guide on the Teaching screen. It is a guide,
 * not a course: no numeral, no floor rule, no term check.
 */

function Side({ v, pos, mins }: { v: ReadinessView; pos: string; mins?: string }) {
  return (
    <div className={styles.cardSide}>
      <span className={styles.numeral}>Guide</span>
      <span className={styles.cardCourse}>Test readiness</span>
      <span className={styles.cardPos}>{pos}</span>
      <div className={styles.dots} aria-label={`${v.done} of ${READINESS_SESSIONS} practice sessions done`}>
        {Array.from({ length: READINESS_SESSIONS }, (_, i) => (
          <span key={i} className={cx(styles.dot, i < v.done && styles.dotOn)} />
        ))}
      </div>
      {mins && <span className={styles.mins}>{mins}</span>}
    </div>
  );
}

const GuideLinks = () => (
  <>
    <Link href={GUIDE_HREF} className={ui.link}>
      Read the guide
    </Link>
    <a href={GUIDE_PDF_HREF} target="_blank" rel="noopener" className={ui.link}>
      Printable PDF
    </a>
  </>
);

/** Screen mode: a reminder from week 30, the day's practice in weeks 34–35, the test in week 36. */
export function ReadinessCard({ v, childId, childName, today }: { v: ReadinessView; childId: string; childName: string; today: string }) {
  const { phase } = v;

  if (phase.kind === "prepare") {
    return (
      <div data-noprint="1" className={styles.card}>
        <Side v={v} pos={`Term 6 · Week ${phase.week} · Grade 3 guide`} />
        <div className={styles.compactBody}>
          <div className={styles.compactText}>
            <div className={styles.compactTitle}>Order the Grade 3 test</div>
            <div className={styles.compactLine}>{inline(v.notes[0] ?? "")}</div>
            <div className={styles.compactNext}>
              The two-week readiness plan starts in week 34: 15–20 minutes a day, alongside the normal Term 6 work. The test is in week 36.
            </div>
          </div>
          <div className={styles.compactActions}>
            <GuideLinks />
          </div>
        </div>
      </div>
    );
  }

  if (phase.kind === "practice") {
    const n = v.next;
    const todayDone = v.doneToday.length > 0 && v.doneToday.map((s) => s.title).join(", ");
    if (!n) {
      return (
        <div data-noprint="1" className={styles.card}>
          <Side v={v} pos={`Term 6 · Week ${phase.week} · Grade 3 guide`} />
          <div className={styles.compactBody}>
            <div className={styles.compactText}>
              <div className={styles.compactTitle}>
                <span className={styles.doneMark}>
                  <CheckMark size={9} />
                </span>
                <span>The two-week plan is done</span>
              </div>
              <div className={styles.compactLine}>The test is in week 36. Until then, a normal week: regular bedtime, breakfast, and a walk outside before the test.</div>
            </div>
            <div className={styles.compactActions}>
              {v.doneToday.length > 0 && <PracticeUndo childId={childId} session={v.doneToday[v.doneToday.length - 1].session} />}
              <GuideLinks />
            </div>
          </div>
        </div>
      );
    }
    return (
      <div data-print-keep="1" data-print-plain="1" className={styles.card}>
        <Side v={v} pos={`Term 6 · Week ${n.week}, Day ${n.day} of the plan`} mins="15–20 min" />
        <div className={styles.fullBody}>
          <div className={styles.fullTitle}>Test readiness · {n.title}</div>
          <div className={styles.fullGrid}>
            <div>
              <div className={styles.label}>From the guide</div>
              <p className={styles.asideText}>{inline(n.text)}</p>
            </div>
            <div className={styles.fullAside}>
              <div>
                <div className={styles.label}>{childName} does</div>
                <div className={styles.asideText}>
                  A short practice in the test&apos;s format, 15–20 minutes, alongside the normal Term 6 work. No cramming.
                </div>
              </div>
              {(n.week !== phase.week || n.day !== phase.day) && (
                <div>
                  <div className={styles.label}>Order</div>
                  <div className={styles.asideText}>Take the days in order. Pick up where you left off.</div>
                </div>
              )}
            </div>
          </div>
          <div data-noprint="1" className={styles.recordRow}>
            <PracticeDone childId={childId} session={n.session} />
            {todayDone && (
              <span className={styles.readinessToday}>
                Done today: {todayDone}. <PracticeUndo childId={childId} session={v.doneToday[v.doneToday.length - 1].session} />
              </span>
            )}
            <Link href={n.href} className={cx(ui.link, styles.manualLink)}>
              Open the day in the guide
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // The week of the test.
  return (
    <div data-print-keep="1" data-print-plain="1" className={styles.card}>
      <Side v={v} pos="Term 6 · Week 36 · Grade 3 guide" />
      <div className={styles.fullBody}>
        <div className={styles.fullTitle}>The Grade 3 test, this week or the next</div>
        <div className={styles.fullGrid}>
          <div>
            {v.tellChild && (
              <>
                <div className={styles.label}>What to tell {childName}</div>
                <p className={styles.readinessQuote}>{inline(v.tellChild)}</p>
              </>
            )}
            <div className={styles.label}>Notes for the parent</div>
            <ul className={styles.readinessList}>
              {v.notes.slice(1).map((t, i) => (
                <li key={i}>{inline(t)}</li>
              ))}
            </ul>
          </div>
          <div className={styles.fullAside}>
            <div>
              <div className={styles.label}>Materials</div>
              <div className={styles.asideText}>{inline(v.materials)}</div>
            </div>
          </div>
        </div>
        <div data-noprint="1" className={styles.recordRow}>
          <TestDateControl childId={childId} givenOn={v.testDate} givenLabel={v.testDate ? fmtLong(v.testDate) : ""} today={today} />
          <Link href={GUIDE_HREF} className={cx(ui.link, styles.manualLink)}>
            Read the guide
          </Link>
        </div>
      </div>
    </div>
  );
}

/** Paper mode: the guide's row in the weekly check-in. */
export function ReadinessCheckin({ v, childId, today }: { v: ReadinessView; childId: string; today: string }) {
  const { phase } = v;
  const week = !v.weekDone[34] ? 34 : !v.weekDone[35] ? 35 : null;
  return (
    <div className={styles.ckRow}>
      <div className={styles.ckMain}>
        <div className={styles.ckInfo}>
          <div className={styles.ckName}>Test readiness · Grade 3 guide</div>
          <div className={styles.ckPos}>
            {phase.kind === "prepare"
              ? `Week ${phase.week}. Order the test now, so it arrives by week 34. The two-week plan starts in week 34.`
              : phase.kind === "practice"
                ? week
                  ? `Week ${week} of the two-week plan: 15–20 minutes a day, from the guide's plan.`
                  : "The two-week plan is done. The test is in week 36."
                : "The week of the test. Follow the test’s own directions; record the date once it’s given."}
          </div>
          <div className={styles.ckPrint}>
            <span>The guide prints with the sample questions, answer sheet and key.</span>
            <a href={GUIDE_PDF_HREF} target="_blank" rel="noopener" className={ui.link}>
              Print
            </a>
          </div>
        </div>
        <div className={styles.ckActions}>
          {phase.kind === "practice" && week && <PracticeWeekDone childId={childId} week={week} />}
          {phase.kind === "test" && (
            <TestDateControl childId={childId} givenOn={v.testDate} givenLabel={v.testDate ? fmtLong(v.testDate) : ""} today={today} />
          )}
        </div>
      </div>
    </div>
  );
}
