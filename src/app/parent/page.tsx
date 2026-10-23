import type { Metadata } from "next";
import Link from "next/link";
import { dismissWeekNote, toggleElective } from "@/app/actions";
import { ChildTabs } from "@/components/app/ChildTabs";
import { ActionButton } from "@/components/ui/ActionButton";
import { cx, ui } from "@/components/ui/Controls";
import { Switch } from "@/components/ui/Switch";
import { isGateWeek, termOfWeek } from "@/lib/content/year";
import { summarize } from "@/lib/domain/attendance";
import { addDays, fmtDayMonth, fmtKicker, fmtLong, fmtShort, yearOf, daysBetween } from "@/lib/domain/dates";
import { gradeLabel, progymStage } from "@/lib/domain/progress";
import { sententiaFor } from "@/lib/domain/sententia";
import { firstSentence, masteryInfo } from "@/lib/domain/course";
import { requireHousehold, selectedChild } from "@/server/session";
import { householdContext, loadChildRecords, type Child, type HouseholdContext } from "@/server/state";
import { childProgress, electiveOptions, liveCourses } from "@/server/views";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Dashboard" };

function greeting(timeZone: string): string {
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", hour12: false }).format(new Date()));
  return hour < 12 ? "Good morning." : hour < 18 ? "Good afternoon." : "Good evening.";
}

export default async function ParentDashboard() {
  const household = await requireHousehold();
  const ctx = householdContext(household);
  const { today, calendar: cal, rules } = ctx;
  const child = await selectedChild(household.children);
  const sent = sententiaFor(today);
  const weekNoteSeen = household.prefs.weekNoteSeen === true;

  const tabs = household.children.map((c) => {
    const p = childProgress(c);
    return { id: c.id, name: c.name, grade: `${p.floor ? p.floor.label : gradeLabel(c.grade)} in progress` };
  });

  const yearTitle = `School year ${yearOf(cal.start)}–${String(yearOf(cal.start) + 1).slice(2)}`;
  const dayNum = cal.dayCount(today);
  const nextOff = cal.nextOff(today);
  const nextOffLabel = nextOff
    ? nextOff.kind === "holiday"
      ? `${nextOff.label} · ${fmtShort(nextOff.date)}`
      : `${nextOff.label} · from ${fmtShort(nextOff.date)}`
    : "None before the last day";

  return (
    <>
      <div className={styles.band}>
        <div className={styles.bandRow}>
          <div>
            <div className={ui.kicker}>{fmtKicker(today)}</div>
            <h1 className={styles.greeting}>{greeting(household.timezone)}</h1>
          </div>
          <div className={styles.bandActions}>
            <Link href="/calendar" className={cx(ui.btn, ui.outline)}>
              Plan next week
            </Link>
            <Link href="/records" className={cx(ui.btn, ui.dark)}>
              Generate report
            </Link>
          </div>
        </div>
        {child && <ChildTabs tabs={tabs} selected={child.id} />}
      </div>

      {!child ? (
        <div className={styles.body}>
          <div className={cx(ui.card, styles.pad)}>
            <div className={styles.cardTitle}>No children yet</div>
            <p className={styles.muted}>
              Add a child from <Link href="/settings#children">Settings</Link> to see where each course stands.
            </p>
          </div>
        </div>
      ) : (
        <Dashboard child={child} ctx={ctx} sent={sent} weekNoteSeen={weekNoteSeen} yearTitle={yearTitle} dayNum={dayNum} nextOffLabel={nextOffLabel} rules={rules} />
      )}
    </>
  );
}

type DashboardProps = {
  child: Child;
  ctx: HouseholdContext;
  sent: ReturnType<typeof sententiaFor>;
  weekNoteSeen: boolean;
  yearTitle: string;
  dayNum: number;
  nextOffLabel: string;
  rules: HouseholdContext["rules"];
};

async function Dashboard({ child, ctx, sent, weekNoteSeen, yearTitle, dayNum, nextOffLabel, rules }: DashboardProps) {
  const { today, calendar: cal, requiredDays, minutesPerDay } = ctx;
  const records = await loadChildRecords(child.id, today);
  const { rows, floor } = childProgress(child);
  const live = liveCourses(child);
  const hasContent = live.length > 0;
  const att = summarize(records.attendance, minutesPerDay, child.priorDays);
  const electives = electiveOptions(child);
  const chosen = electives.filter((e) => e.on);
  const floorLabel = floor?.label ?? gradeLabel(child.grade);

  // Courses closest to their term check, for the review cards.
  const upcoming = live
    .filter(({ e }) => e.pos <= 36)
    .map(({ e, course }) => {
      const term = termOfWeek(e.pos);
      return { e, course, term, weeksLeft: term * 6 - e.pos };
    })
    .sort((a, b) => a.weeksLeft - b.weeksLeft)
    .slice(0, 4);

  // Alerts, derived from the record.
  const alerts: { text: string; meta: string }[] = [];
  let prevSchool = addDays(today, -1);
  while (prevSchool >= cal.start && cal.dayType(prevSchool) !== "school") prevSchool = addDays(prevSchool, -1);
  const taughtDays = records.attendance.filter((a) => a.routineMins + a.extra.reduce((x, y) => x + y.mins, 0) > 0).map((a) => a.date);
  const lastTaught = taughtDays.filter((d) => d < today).at(-1);
  if (hasContent && prevSchool >= cal.start && (!lastTaught || lastTaught < prevSchool)) {
    const since = lastTaught ?? cal.start;
    alerts.push({
      text: lastTaught ? `${child.name} has no teaching day recorded since ${fmtShort(lastTaught)}.` : `${child.name} has no teaching day recorded yet this year.`,
      meta: `Reporting · ${floorLabel} · ${Math.max(1, daysBetween(since, today))} days`,
    });
  }
  for (const { e, course } of live) {
    if (e.reviewTerm) alerts.push({ text: `${course.course} has a review week before Term ${e.reviewTerm + 1}.`, meta: `Term check · Term ${e.reviewTerm}` });
    else if (e.pos <= 36 && isGateWeek(e.pos)) alerts.push({ text: `${course.course}: the Term ${termOfWeek(e.pos)} check is this week.`, meta: `Term check · Week ${e.pos} of 36` });
  }
  if (floor && floor.openCount > 0) {
    alerts.push({
      text: `${floor.openCount === 1 ? "One course remains" : `${floor.openCount} courses remain`} open in ${floor.label}. ${floor.course.name} is furthest behind.`,
      meta: `Grade level · ${floor.course.name} in Week ${floor.course.week} of 36`,
    });
  }

  return (
    <div className={styles.body}>
      <div className={styles.col}>
        <div className={ui.card}>
          <div className={styles.cardHead}>
            <span className={styles.cardTitle}>Where each course stands</span>
            <div className={styles.headMeta}>
              <span className={styles.metaGrey}>{floor ? `${floor.requiredCount} required courses` : "No courses yet"}</span>
              <span className={styles.metaGold}>Progymnasmata · stage {progymStage(floor?.grade ?? child.grade)}</span>
            </div>
          </div>
          <div className={styles.rows}>
            {rows.length === 0 && (
              <p className={styles.muted}>{gradeLabel(child.grade)} manuals aren’t loaded yet. Courses appear here once they are.</p>
            )}
            {rows.map((r) => (
              <Link key={r.courseId} href={`/course/${r.courseId}`} className={styles.subject}>
                <div>
                  <div className={styles.subjectName}>{r.courseId === "latin" ? "Latin I" : r.name}</div>
                  <div className={styles.subjectMeta}>
                    <span className={styles.gradeLabel}>{r.gradeLabel}</span>
                    {r.isFloor && <span className={ui.badgeFloor}>Floor</span>}
                    {r.ahead && <span className={ui.badgeAhead}>Ahead</span>}
                  </div>
                </div>
                <div className={styles.bar}>
                  <div className={styles.barFill} style={{ width: `${r.pct}%` }} />
                </div>
                <div className={styles.lesson}>{r.lessonLabel}</div>
                <div className={styles.mark}>{r.standing}</div>
              </Link>
            ))}
          </div>
        </div>

        {upcoming.length > 0 && (
          <div className={ui.card}>
            <div className={styles.cardHead}>
              <span className={styles.cardTitle}>Curriculum for review</span>
              <Link href="/course" className={ui.link}>
                Open full syllabus
              </Link>
            </div>
            <div className={styles.review}>
              {upcoming.map(({ e, course, term, weeksLeft }) => {
                const t = course.terms[term - 1];
                const m = masteryInfo(course, term);
                return (
                  <div key={course.id} className={styles.reviewCard}>
                    <div className={styles.reviewKicker}>{course.dash}</div>
                    <div className={styles.reviewTitle}>
                      Term {term}
                      {t.title ? ` · ${t.title}` : ""}
                    </div>
                    <div className={styles.reviewNote}>
                      {e.reviewTerm
                        ? `A review week comes before Term ${e.reviewTerm + 1}.`
                        : weeksLeft === 0
                          ? "The term check is this week."
                          : `The term check is in week ${term * 6}, ${weeksLeft} ${weeksLeft === 1 ? "week" : "weeks"} away.`}{" "}
                      {firstSentence(m.text)}
                    </div>
                    <Link href={`/course/${course.id}?tab=${term}`} className={cx(ui.btn, ui.outline, ui.small)}>
                      Read the term
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className={styles.col}>
        <div className={styles.sententia}>
          <div className={styles.sKicker}>Sententia · today</div>
          <div className={styles.sLatin}>{sent.la}</div>
          <div className={styles.sEnglish}>{sent.en}</div>
          {sent.note && <div className={styles.sNote}>{sent.note}</div>}
          <div className={styles.sFoot}>Your children see this same line today.</div>
        </div>

        {!weekNoteSeen && (
          <div className={styles.weekNote}>
            <div className={styles.weekNoteHead}>
              <span className={styles.weekNoteTitle}>How the week works</span>
              <ActionButton action={dismissWeekNote} className={ui.quiet}>
                Got it
              </ActionButton>
            </div>
            <div className={styles.weekNoteBody}>
              Each school day has a short daily core: the drills and recitation that keep facts from fading. Everything else
              is the week’s work, done on any day, in any order, early or late. On a sick day, do just the daily core; if even
              that can’t happen, mark a pause day and the streak waits.
            </div>
          </div>
        )}

        {floor && (
          <div className={styles.floor}>
            <div className={styles.floorKicker}>Toward {floor.label}</div>
            <div className={styles.floorSentence}>
              {floor.course.courseId === "latin" ? "Latin I" : floor.course.name} is what stands between {child.name} and
              completing {floor.label}.
            </div>
            <div className={styles.floorRow}>
              <span>
                {floor.course.lessonLabel} · {floor.openCount} of {floor.requiredCount} courses open
              </span>
              <span className={styles.floorRemain}>{floor.weeksRemaining} weeks remain</span>
            </div>
            <div className={styles.floorNote}>
              Completed to date: {floor.completedLabel}. Grade level is certified by the slowest required subject, never
              averaged — so the record never claims more than {child.name} has finished.
            </div>
          </div>
        )}

        <div className={cx(ui.card, styles.pad)}>
          <div className={styles.sideHead}>
            <span className={styles.cardTitle}>School year</span>
            <span className={styles.metaSmall}>{yearTitle}</span>
          </div>
          <div className={styles.bigNum}>
            Day {dayNum} of {requiredDays}
          </div>
          <div className={cx(styles.kv, styles.kvFirst)}>
            <span>First day</span>
            <span>{fmtLong(cal.start)}</span>
          </div>
          <div className={styles.kv}>
            <span>Last day</span>
            <span>{fmtLong(cal.last)}</span>
          </div>
          <div className={styles.kv}>
            <span>Next day off</span>
            <span className={styles.right}>{nextOffLabel}</span>
          </div>
          <Link href="/calendar" className={cx(ui.link, styles.cardLink)}>
            Open the calendar
          </Link>
        </div>

        {hasContent && (
          <div className={cx(ui.card, styles.pad)}>
            <div className={styles.sideHead}>
              <span className={styles.cardTitle}>Attendance</span>
              <span className={styles.metaSmall}>
                {rules ? `${rules.name} · ${requiredDays} days · 4½ hours` : `${requiredDays} days · 4½ hours`}
              </span>
            </div>
            <div className={styles.attRow}>
              <span className={styles.attNum}>{att.days}</span>
              <span className={styles.attOf}>of {requiredDays} days logged</span>
            </div>
            <div className={styles.thinBar}>
              <div style={{ width: `${Math.min(100, Math.round((att.days / requiredDays) * 100))}%` }} />
            </div>
            <div className={styles.kvTight}>
              <span>Average day</span>
              <span>{att.averageHours} hours</span>
            </div>
            <div className={styles.kvTight}>
              <span>Days under 4½ hours</span>
              {att.shortDays ? <span className={styles.deep}>{att.shortDays}</span> : <span className={styles.green}>None</span>}
            </div>
            <Link href="/teaching#time" className={cx(ui.link, styles.cardLink)}>
              Log today’s time
            </Link>
          </div>
        )}

        <div className={cx(ui.card, styles.pad)}>
          <div className={styles.sideHead}>
            <span className={styles.cardTitle}>Electives</span>
            <span className={styles.metaSmall}>{chosen.length ? chosen.map((e) => e.name).join(" and ") : "None chosen"}</span>
          </div>
          {electives.length ? (
            <>
              <div className={styles.elNote}>
                {gradeLabel(child.grade)} practical arts. Take one, both or neither. They don&apos;t count toward the grade.
              </div>
              {electives.map((e) => (
                <div key={e.id} className={styles.elRow}>
                  <Link href={`/course/${e.id}?tab=0`} className={styles.elName}>
                    {e.name}
                  </Link>
                  <Switch on={e.on} label={`${e.name} elective`} onToggle={toggleElective.bind(null, child.id, e.id)} />
                </div>
              ))}
            </>
          ) : (
            <div className={styles.elNote}>
              {child.name}&apos;s {gradeLabel(child.grade)} electives aren&apos;t loaded yet.
            </div>
          )}
        </div>

        <div className={cx(ui.card, styles.pad)}>
          <div className={styles.sideHead}>
            <span className={styles.cardTitle}>Reporting</span>
            {rules && <span className={styles.stateBadge}>{rules.name}</span>}
          </div>
          {rules ? (
            <>
              <div className={styles.report}>
                <div>
                  <div className={styles.reportLabel}>Declaration of Intent</div>
                  <div className={styles.reportDetail}>Due within 30 days of starting, then by 1 September</div>
                </div>
                <span className={styles.reportValue}>Due {fmtDayMonth(addDays(cal.start, 30))}</span>
              </div>
              <div className={styles.report}>
                <div>
                  <div className={styles.reportLabel}>Days of instruction</div>
                  <div className={styles.reportDetail}>Logged from the teaching record</div>
                </div>
                <span className={styles.reportValue}>
                  {att.days} of {requiredDays}
                </span>
              </div>
              <div className={styles.report}>
                <div>
                  <div className={styles.reportLabel}>Next report due</div>
                  <div className={styles.reportDetail}>Annual · {rules.name}</div>
                </div>
                <span className={styles.reportValue}>1 Sep {yearOf(cal.last)}</span>
              </div>
              <div className={styles.reportFoot}>
                {rules.name} asks once a year. The Declaration of Intent and the annual report will be prepared from this
                record.
              </div>
            </>
          ) : (
            <div className={styles.reportFoot}>
              State reporting covers Georgia for now. The record is kept the same way everywhere; tell us your state and
              we’ll add its rules.
            </div>
          )}
        </div>

        {alerts.length > 0 && (
          <div className={ui.card}>
            <div className={styles.cardHead}>
              <span className={styles.cardTitle}>Alerts</span>
              <span className={styles.alertCount}>{alerts.length}</span>
            </div>
            {alerts.map((a, i) => (
              <div key={i} className={styles.alert}>
                <div className={styles.alertDot} />
                <div>
                  <div className={styles.alertText}>{a.text}</div>
                  <div className={styles.alertMeta}>{a.meta}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
