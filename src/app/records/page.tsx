import type { Metadata } from "next";
import Link from "next/link";
import { Crest } from "@/components/Crest";
import { cx, ui } from "@/components/ui/Controls";
import { getCourse, getWeek } from "@/lib/content/load";
import { termOfWeek } from "@/lib/content/year";
import { dayMinutes, summarize } from "@/lib/domain/attendance";
import { itemKey, itemTitle } from "@/lib/domain/course";
import { addDays, fmtDayMonth, fmtLong, weekStart, WEEKDAYS } from "@/lib/domain/dates";
import { gradeLabel, overallStanding, progymStage } from "@/lib/domain/progress";
import { requireHousehold, selectedChild } from "@/server/session";
import { householdContext, loadChildRecords } from "@/server/state";
import { childProgress, isScored, liveCourses } from "@/server/views";
import { IncompleteSwitch, PrintTranscript } from "./client";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Records" };

type Search = { tab?: string; incomplete?: string };

export default async function RecordsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const tab = sp.tab === "portfolio" || sp.tab === "transcript" ? sp.tab : "log";
  const incompleteOnly = sp.incomplete === "1";
  const household = await requireHousehold();
  const ctx = householdContext(household);
  const child = await selectedChild(household.children);
  if (!child) {
    return (
      <main data-screen-label="Records" className={styles.screen}>
        <div className={styles.wrap}>
          <h1 className={styles.title}>Records &amp; proof of learning</h1>
          <p className={styles.muted}>
            Add a child from <Link href="/settings#children">Settings</Link> to start the record.
          </p>
        </div>
      </main>
    );
  }

  const rec = await loadChildRecords(child.id, ctx.today);
  const { rows, floor } = childProgress(child);
  const floorLabel = floor?.label ?? gradeLabel(child.grade);
  const att = summarize(rec.attendance, ctx.minutesPerDay, child.priorDays);
  const standing = overallStanding(child.gates.map((g) => ({ ...g })));
  const live = liveCourses(child);
  const href = (t: string, inc = incompleteOnly) => `/records?tab=${t}${inc ? "&incomplete=1" : ""}`;

  // The work log: items recorded, term checks, and what's still open this week.
  type LogRow = { key: string; title: string; subject: string; date: string; sort: string; by: string; mark: string; complete: boolean };
  const log: LogRow[] = [];
  for (const r of rec.records) {
    const c = getCourse(r.grade, r.courseId);
    const it = c && getWeek(c, r.week)?.items.find((i) => i.track === r.track && i.key === r.itemKey);
    if (!c || !it) continue;
    log.push({ key: `${r.courseId}:${r.week}:${r.track}${r.itemKey}`, title: `Week ${r.week} · ${itemTitle(it)}`, subject: c.dash, date: fmtDayMonth(r.doneOn), sort: r.doneOn, by: "Parent", mark: "Complete", complete: true });
  }
  for (const g of child.gates) {
    const c = getCourse(g.grade, g.courseId);
    if (!c) continue;
    const d = g.recordedAt.toISOString().slice(0, 10);
    log.push({ key: `gate:${g.courseId}:${g.term}`, title: `Term ${g.term} check`, subject: c.dash, date: fmtDayMonth(d), sort: d + "~", by: "Parent", mark: g.score != null ? `${g.score} of ${g.of}` : "Complete", complete: true });
  }
  log.sort((a, b) => (a.sort < b.sort ? 1 : -1));
  const open: LogRow[] = [];
  for (const { e, course } of live) {
    if (e.pos > 36 || e.reviewTerm) continue;
    const wk = getWeek(course, e.pos);
    const done = new Set(rec.records.filter((r) => r.courseId === course.id && r.grade === e.grade && r.week === e.pos).map((r) => r.track[0] + r.itemKey));
    for (const it of wk?.items ?? []) {
      if (!done.has(itemKey(it))) open.push({ key: `open:${course.id}:${itemKey(it)}`, title: `Week ${e.pos} · ${itemTitle(it)}`, subject: course.dash, date: "—", sort: "", by: "—", mark: "—", complete: false });
    }
  }
  const logRows = incompleteOnly ? open : [...log.slice(0, 60), ...open.slice(0, 20)];

  // Days logged, by week, for the last six weeks.
  const taught = new Map(rec.attendance.map((a) => [a.date, dayMinutes(a)]));
  const days = [...household.schoolDays].sort();
  const weeks = Array.from({ length: 6 }, (_, i) => {
    const mon = addDays(weekStart(ctx.today), -7 * (5 - i));
    const cells = days.map((wd) => {
      const d = addDays(mon, (wd + 6) % 7);
      return { d, present: (taught.get(d) ?? 0) > 0, future: d > ctx.today };
    });
    return { label: `Wk of ${fmtDayMonth(mon)}`, cells, n: cells.filter((c) => c.present).length };
  }).filter((w) => w.cells.some((c) => c.d >= ctx.calendar.start));

  const required = rows.filter((r) => !r.elective);
  const rules = ctx.rules;
  const subjectStatus = (ids: string[]) =>
    ids
      .map((id) => rows.find((r) => r.courseId === id))
      .filter(Boolean)
      .map((r) => `${r!.courseId === "latin" ? "Latin I" : r!.name} · ${r!.lessonLabel}`);

  return (
    <main data-screen-label="Records" data-print-page="1" className={styles.screen}>
      <div className={styles.wrap} data-print-page="1">
        <div data-noprint="1" className={styles.head}>
          <div>
            <div className={ui.kicker}>
              {child.name} · {floorLabel} in progress
            </div>
            <h1 className={styles.title}>Records &amp; proof of learning</h1>
          </div>
          <div className={styles.headActions}>
            <PrintTranscript onTranscript={tab === "transcript"} href={href("transcript")} />
            <span className={cx(ui.btn, ui.inactive)} title="The Declaration of Intent and annual report are being built">
              File with the state · soon
            </span>
          </div>
        </div>

        <div data-noprint="1" className={styles.tabs}>
          {[
            ["log", "Work log"],
            ["portfolio", "Portfolio"],
            ["transcript", "Transcript"],
          ].map(([k, label]) => (
            <Link key={k} href={href(k)} className={cx(styles.tab, tab === k && styles.tabOn)}>
              {label}
            </Link>
          ))}
          {tab === "log" && (
            <div className={styles.incomplete}>
              <span>Show incomplete only</span>
              <IncompleteSwitch on={incompleteOnly} />
            </div>
          )}
        </div>

        {tab === "log" && (
          <div className={styles.logGrid}>
            <div className={ui.card}>
              <div className={cx(styles.logRow, styles.logHead)}>
                <span>Assignment</span>
                <span>Subject</span>
                <span>Done</span>
                <span>Recorded by</span>
                <span className={styles.right}>Mark</span>
              </div>
              {logRows.length === 0 && <div className={styles.empty}>{incompleteOnly ? "Nothing open this week." : "Nothing recorded yet. Work recorded on Teaching appears here."}</div>}
              {logRows.map((g) => (
                <div key={g.key} className={styles.logRow}>
                  <span className={styles.logTitle}>{g.title}</span>
                  <span className={styles.logSubject}>{g.subject}</span>
                  <span className={styles.logMeta}>{g.date}</span>
                  <span className={styles.logMeta}>{g.by}</span>
                  <span className={styles.logMark}>{g.mark}</span>
                </div>
              ))}
              <div className={styles.logFoot}>
                Scored work shows its score against the manual&apos;s mastery line. Everything else is recorded Complete or not yet. Parents can add a note, but not raise a score.
              </div>
            </div>

            <div className={styles.side}>
              <div className={styles.standing}>
                <div className={styles.standingKicker}>Standing to date</div>
                <div className={styles.standingBig}>{standing.label}</div>
                <div className={styles.standingNote}>{standing.note}</div>
                <div className={styles.standingFoot}>Marks describe work already done. They do not certify a grade level — completing the required lessons does.</div>
              </div>

              <div id="attendance" className={cx(ui.card, styles.box)}>
                <div className={styles.boxTitle}>Days logged</div>
                <div className={styles.boxSub}>Kept for the state, not as a measure of progress.</div>
                {weeks.map((w) => (
                  <div key={w.label} className={styles.week}>
                    <span className={styles.weekLabel}>{w.label}</span>
                    <div className={styles.weekDays}>
                      {w.cells.map((c) => (
                        <span key={c.d} title={`${WEEKDAYS[new Date(c.d + "T00:00:00Z").getUTCDay()]} ${fmtDayMonth(c.d)}`} className={cx(styles.dayBox, c.present && styles.dayOn)} />
                      ))}
                    </div>
                    <span className={styles.weekN}>
                      {w.n} {w.n === 1 ? "day" : "days"}
                    </span>
                  </div>
                ))}
                <div className={styles.attSum}>
                  <div className={styles.kv}>
                    <span>Days logged</span>
                    <span>
                      {att.days} of {ctx.requiredDays}
                    </span>
                  </div>
                  <div className={styles.kv}>
                    <span>Average day</span>
                    <span>{att.averageHours} hours</span>
                  </div>
                  <div className={styles.kv}>
                    <span>Days under 4½ hours</span>
                    <span className={att.shortDays ? styles.deep : styles.green}>{att.shortDays || "None"}</span>
                  </div>
                  {child.priorDays > 0 && <div className={styles.boxSub}>Includes {child.priorDays} days taught before joining.</div>}
                </div>
              </div>

              {rules && (
                <div className={cx(ui.card, styles.box)}>
                  <div className={styles.boxTitle}>{rules.name} summary</div>
                  <div className={styles.boxSub}>
                    {rules.citation} · {rules.requiredDays} days, 4½ hours each, five required subjects.
                  </div>
                  {rules.subjects.map((s) => (
                    <div key={s.name} className={styles.subject}>
                      <div className={styles.subjectName}>{s.name}</div>
                      {subjectStatus(s.courses).map((t) => (
                        <div key={t} className={styles.subjectCourse}>
                          {t}
                        </div>
                      ))}
                    </div>
                  ))}
                  <div className={styles.boxSub}>Latin, Bible, Fine Arts, PE and Virtue Formation go beyond the requirement.</div>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "portfolio" && (
          <div className={cx(ui.card, styles.portfolio)}>
            <div className={styles.boxTitle}>Portfolio</div>
            <p className={styles.muted}>
              Drawings, copywork, recordings and photographs of finished work will be kept here, filed by course. Adding them arrives with accounts; until then, keep them in
              the field notebook and folders the manuals describe.
            </p>
          </div>
        )}

        {tab === "transcript" && (
          <div data-print-plain="1" className={styles.transcript}>
            <div className={styles.tHead}>
              <Crest width={34} height={38} />
              <div className={styles.tBrand}>PROVIDENCE HOME ACADEMY</div>
              <div className={styles.tSub}>Official record of study</div>
            </div>
            <div className={styles.tMeta}>
              <div>
                <span>Student</span>
                <div>{child.name}</div>
              </div>
              <div>
                <span>Completed</span>
                <div>{floor?.completedLabel ?? "—"}</div>
              </div>
              <div>
                <span>In progress</span>
                <div>{floorLabel}</div>
              </div>
            </div>
            <div className={styles.tBar}>
              <span>Required courses · {floorLabel}</span>
              <span>
                {required.length} required courses · Progymnasmata · stage {progymStage(floor?.grade ?? child.grade)}
              </span>
            </div>
            {required.map((r) => {
              const past = floor ? r.grade > floor.grade : false;
              const c = getCourse(child.grade, r.courseId);
              return (
                <div key={r.courseId} className={styles.tRow}>
                  <span className={styles.tName}>{r.courseId === "latin" ? "Latin I" : r.name}</span>
                  <span className={past ? styles.tDone : styles.tPending}>
                    {past ? `Complete · now in ${gradeLabel(r.grade)}` : `In progress · Term ${termOfWeek(r.week)} · Week ${r.week}`}
                  </span>
                  <span className={styles.tMark}>{past ? (c && isScored(c) ? "Mastered" : "Complete") : "—"}</span>
                </div>
              );
            })}
            <div className={styles.tNote}>
              A grade level is certified only when every required subject for that level is finished. Subjects carried beyond the level in progress appear on the enrichment
              record and are not required for completion.
            </div>
            <div className={styles.tFoot}>
              <span>Days of instruction logged: {att.days}</span>
              <span>Issued {fmtLong(ctx.today)}</span>
            </div>
            <div data-printonly="1" className={styles.sign}>
              <div className={styles.signWide}>
                <div className={styles.signLine} />
                <div className={styles.signLabel}>Signature of instructing parent</div>
              </div>
              <div className={styles.signNarrow}>
                <div className={styles.signLine} />
                <div className={styles.signLabel}>Date</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
