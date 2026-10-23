import type { Metadata } from "next";
import Link from "next/link";
import { ChildPills } from "@/components/app/ChildTabs";
import { Blocks } from "@/components/manual/Blocks";
import { KeysProvider } from "@/components/manual/Keys";
import { Screen } from "@/components/Screen";
import { CompactActions, RecordButtons } from "@/components/teaching/CardButtons";
import {
  ExtraOptions,
  ModeToggle,
  PaperRoutineToggle,
  PauseButtons,
  PrintPageButton,
  RemoveExtra,
} from "@/components/teaching/Controls";
import { PaperRow } from "@/components/teaching/PaperRow";
import { PrintLink } from "@/components/teaching/PrintLink";
import { ReadinessCard, ReadinessCheckin } from "@/components/teaching/Readiness";
import styles from "@/components/teaching/Teaching.module.css";
import { cx, CheckMark, ui } from "@/components/ui/Controls";
import { EXTRA_OPTIONS, hm } from "@/lib/domain/attendance";
import { fmtKicker } from "@/lib/domain/dates";
import { gradeLabel } from "@/lib/domain/grades";
import { sententiaFor } from "@/lib/domain/sententia";
import { requireHousehold, selectedChild } from "@/server/session";
import { readinessToday, readinessView } from "@/server/readiness";
import { householdContext, loadChildRecords, type Child, type ChildRecords, type HouseholdContext } from "@/server/state";
import { paperTeaching, paperUsualMinutes, recitationThisWeek, screenTeaching, type TeachingCard } from "@/server/teaching";
import { childProgress, liveCourses } from "@/server/views";

export const metadata: Metadata = { title: "Teaching today" };

export default async function TeachingPage() {
  const household = await requireHousehold();
  const ctx = householdContext(household);
  const child = await selectedChild(household.children);
  const sent = sententiaFor(ctx.today);

  if (!child) {
    return (
      <Screen label="Teaching today" tone="teaching">
        <div className={styles.wrap}>
          <h1 className={styles.title}>Today&apos;s teaching</h1>
          <p className={styles.intro}>
            Add a child from <Link href="/settings#children">Settings</Link> to begin.
          </p>
        </div>
      </Screen>
    );
  }

  const rec = await loadChildRecords(child.id, ctx.today);
  const floor = childProgress(child).floor;
  const floorLabel = floor?.label ?? gradeLabel(child.grade);
  const live = liveCourses(child);
  const hasContent = live.length > 0;
  const mode = child.mode;
  const tType = ctx.calendar.dayType(ctx.today);
  const off = tType === "holiday" || tType === "break";
  const offName = tType === "holiday" ? ctx.calendar.holidays.get(ctx.today) : ctx.calendar.breakAt(ctx.today)?.label;
  const masthead = `${child.name} · ${floorLabel} · ${fmtKicker(ctx.today).replace(" · ", " ")}`;

  const intro =
    mode === "paper"
      ? "Teach from the printed booklets. This page tells you what to print next and asks, once a week, how the week went."
      : hasContent
        ? `Every ${floorLabel} course ${child.name} is still working through, straight from its manual: the daily core first, then the next task in each weekly-queue course.`
        : `${child.name}'s ${gradeLabel(child.grade)} manuals aren't loaded yet. The day's work will appear here once they are.`;

  return (
    <Screen label="Teaching today" tone="teaching" printPage>
      <KeysProvider>
        <div className={styles.wrap} data-print-page="1">
          <div data-printonly="1" className={styles.printHead}>
            <span className={styles.printBrand}>PROVIDENCE HOME ACADEMY</span>
            <span className={styles.printMeta}>{masthead}</span>
          </div>

          <div className={styles.head}>
            <div>
              <div data-noprint="1" className={ui.kicker}>
                {fmtKicker(ctx.today)} · {child.name}, {floorLabel}
              </div>
              <h1 className={styles.title}>Today&apos;s teaching</h1>
              <p className={styles.intro}>{intro}</p>
              {off && (
                <div data-noprint="1" className={styles.offBanner}>
                  <span className={styles.offTitle}>Today is {offName}.</span>
                  <span className={styles.offBody}>
                    It&apos;s {tType === "holiday" ? "a federal holiday and a day off on your calendar" : "part of a planned break on your calendar"}. Rest, and
                    nothing breaks. Or teach as usual: everything still counts, and the daily core adds to the streak.
                  </span>
                  <Link href="/calendar" className={ui.link}>
                    Open the calendar
                  </Link>
                </div>
              )}
              <ChildPills tabs={household.children.map((c) => ({ id: c.id, name: c.name }))} selected={child.id} />
            </div>
            <div data-noprint="1" className={styles.headSide}>
              <ModeToggle childId={child.id} mode={mode} name={child.name} />
              {mode === "screen" && (
                <>
                  <PrintPageButton />
                  <span className={styles.headNote}>For a day away from the screen. To teach from paper every day, choose On paper.</span>
                </>
              )}
            </div>
          </div>

          <div data-print-plain="1" data-print-keep="1" className={styles.sententia}>
            <div className={styles.sMain}>
              <div className={styles.sLatin}>{sent.la}</div>
              <div className={styles.sEnglish}>{sent.en}</div>
              {sent.note && <div className={styles.sNote}>{sent.note}</div>}
              <div className={styles.sCue}>Read it aloud once. Have {child.name} repeat it back before you begin.</div>
            </div>
            <div className={styles.sSide}>
              <div className={styles.sKicker}>Sententia · today</div>
              <div className={styles.sSideNote}>Every household sees this line today.</div>
            </div>
          </div>

          {!hasContent ? null : mode === "paper" ? (
            <PaperMode child={child} ctx={ctx} rec={rec} />
          ) : (
            <ScreenMode child={child} ctx={ctx} rec={rec} floorLabel={floorLabel} masthead={masthead} />
          )}

          {hasContent && <TimeLog child={child} ctx={ctx} rec={rec} />}
        </div>
      </KeysProvider>
    </Screen>
  );
}

function Card({ card, childId, childName }: { card: TeachingCard; childId: string; childName: string }) {
  const side = (
    <div className={styles.cardSide}>
      <span className={styles.numeral}>{card.numeral}</span>
      <span className={styles.cardCourse}>{card.course}</span>
      {card.split && (
        <>
          <span className={styles.splitBadge}>Daily + weekly</span>
          <span className={styles.splitNote}>{card.splitNote}</span>
        </>
      )}
      <span className={styles.cardPos}>{card.pos}</span>
      <div className={styles.dots}>
        {card.dots.map((d, i) => (
          <span key={i} className={cx(styles.dot, d && styles.dotOn)} />
        ))}
      </div>
      {!card.compact && <span className={styles.mins}>{card.mins}</span>}
    </div>
  );

  if (card.compact) {
    return (
      <div data-noprint="1" className={styles.card}>
        {side}
        <div className={styles.compactBody}>
          <div className={styles.compactText}>
            <div className={styles.compactTitle}>
              {card.done && (
                <span className={styles.doneMark}>
                  <CheckMark size={9} />
                </span>
              )}
              <span>{card.item}</span>
            </div>
            <div className={styles.compactLine}>{card.line}</div>
            {card.nextLine && <div className={styles.compactNext}>{card.nextLine}</div>}
          </div>
          <CompactActions childId={childId} card={card} />
        </div>
      </div>
    );
  }

  return (
    <div data-print-keep="1" data-print-plain="1" className={styles.card}>
      {side}
      <div className={styles.fullBody}>
        <div className={styles.fullTitle}>{card.item}</div>
        <div className={styles.fullGrid}>
          <div>
            <div className={styles.label}>{card.sourceLabel}</div>
            <Blocks blocks={card.blocks} />
          </div>
          <div className={styles.fullAside}>
            <div>
              <div className={styles.label}>{childName} does</div>
              <div className={styles.asideText}>{card.does}</div>
            </div>
            {card.order && (
              <div>
                <div className={styles.label}>Order</div>
                <div className={styles.asideText}>{card.order}</div>
              </div>
            )}
          </div>
        </div>
        <div data-printonly="1" className={styles.howItWent}>
          <span className={styles.howLabel}>How it went</span>
          <span className={styles.howLine} />
        </div>
        <div data-noprint="1" className={styles.recordRow}>
          {card.record && <RecordButtons childId={childId} input={card.record} />}
          <Link href={`/course/${card.courseId}?tab=${Math.ceil(card.week / 6)}&item=w${card.week}`} className={cx(ui.link, styles.manualLink)}>
            Open the week in the manual
          </Link>
        </div>
      </div>
    </div>
  );
}

function ScreenMode({ child, ctx, rec, floorLabel, masthead }: { child: Child; ctx: HouseholdContext; rec: ChildRecords; floorLabel: string; masthead: string }) {
  const t = screenTeaching(child, ctx, rec);
  const recitation = recitationThisWeek(child);
  const { rows } = childProgress(child);
  const required = rows.filter((r) => !r.elective);
  const keys = [...t.daily, ...t.week].filter((c) => !c.compact && c.answers.length);
  const readiness = readinessView(child, ctx, rec);
  return (
    <div>
      <div data-print-plain="1" className={styles.ledger}>
        <div className={styles.ledgerHead}>
          <span className={styles.ledgerTitle}>The morning, in order</span>
          <span className={styles.ledgerCount}>
            {t.recorded} of {t.total} recorded
          </span>
        </div>

        <div data-print-keep="1" className={styles.section}>
          <div className={styles.sectionRow}>
            <div className={styles.sectionText}>
              <div className={styles.sectionHead}>{t.dailyHead}</div>
              <div className={styles.sectionNote}>Short practice that has to happen daily. It’s what keeps facts from fading.</div>
            </div>
            <div data-noprint="1" className={styles.counter}>
              <div className={styles.counterBig}>{t.streak.label}</div>
              <div className={styles.counterSub}>{t.streak.sub}</div>
            </div>
          </div>
          <div data-noprint="1" className={styles.sick}>
            <div className={styles.sickText}>
              <span className={styles.sickHead}>Sick day?</span> Just do the daily core. The week’s work will wait. If even that can’t happen, mark the day and the
              streak pauses instead of breaking.
            </div>
            <div className={styles.sickActions}>
              <PauseButtons childId={child.id} paused={t.streak.paused} canMark={t.streak.canMark} canPause={t.streak.canPause} />
              <span className={styles.pauseNote}>{t.streak.pauseNote}</span>
            </div>
          </div>
        </div>
        {t.daily.map((c) => (
          <Card key={c.id} card={c} childId={child.id} childName={child.name} />
        ))}
        {readiness && <ReadinessCard v={readiness} childId={child.id} childName={child.name} today={ctx.today} />}

        <div data-print-keep="1" className={styles.section}>
          <div className={styles.sectionRow}>
            <div className={styles.sectionText}>
              <div className={styles.sectionHead}>This week · your schedule</div>
              <div className={styles.sectionNote}>
                Do these any day this week, in any order (unless a lesson says otherwise). Finish early, double up, or save one for Saturday.
              </div>
            </div>
            <div data-noprint="1" className={styles.counter}>
              <div className={styles.counterBig}>{t.weekLabel}</div>
              <div className={styles.counterSub}>{t.weekSub}</div>
            </div>
          </div>
        </div>
        {t.week.map((c) => (
          <Card key={c.id} card={c} childId={child.id} childName={child.name} />
        ))}
        <div data-noprint="1" className={styles.footer}>
          Answer keys stay off the printed card and print on a separate parent sheet.
        </div>
      </div>

      {keys.length > 0 && (
        <div data-printonly="1" className={styles.keySheet}>
          <div className={styles.printHead}>
            <span className={styles.printBrand}>ANSWER KEY · PARENT&apos;S COPY</span>
            <span className={styles.printMeta}>{masthead}</span>
          </div>
          {keys.map((k) => (
            <div key={k.id} className={styles.keyRow}>
              <div className={styles.keyTitle}>
                {k.course} · {k.item}
              </div>
              <div className={styles.keyText}>{k.answers.join(" · ")}</div>
            </div>
          ))}
        </div>
      )}

      <div data-noprint="1" className={styles.lower}>
        <div className={styles.memory}>
          <div className={styles.memoryKicker}>Memory work</div>
          {recitation ? (
            <>
              <div className={styles.memoryText}>{recitation}</div>
              <div className={styles.memoryNote}>This week’s recitation pieces. Hear them before Friday.</div>
            </>
          ) : (
            <div className={styles.memoryNote}>No recitation pieces this week.</div>
          )}
        </div>
        <div className={cx(ui.card, styles.tiles)}>
          <div className={styles.tilesTitle}>Every course</div>
          <div className={styles.tilesSub}>
            {required.length} required courses at {floorLabel}.
          </div>
          <div className={styles.tileGrid}>
            {required.map((r) => (
              <Link key={r.courseId} href={`/course/${r.courseId}`} className={styles.tile}>
                <div className={styles.tileName}>{r.courseId === "latin" ? "Latin I" : r.name}</div>
                <div className={styles.tileBar}>
                  <div style={{ width: `${r.pct}%` }} />
                </div>
                <div className={styles.tileLesson}>{r.lessonLabel}</div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PaperMode({ child, ctx, rec }: { child: Child; ctx: HouseholdContext; rec: ChildRecords }) {
  const { rows, queue } = paperTeaching(child, rec);
  const readiness = readinessView(child, ctx, rec);
  return (
    <div data-noprint="1" className={styles.paper}>
      <div className={styles.paperMain}>
        <div className={ui.card}>
          <div className={styles.paperHead}>
            <div className={styles.paperTitle}>This week’s check-in</div>
            <div className={styles.paperNote}>
              <span className={styles.ink}>Week done</span> means everything in the booklet for that week is finished, so the course moves on.{" "}
              <span className={styles.ink}>Carry over</span> means the week isn’t finished, because of illness, travel or simply needing more time. Keep working from
              the same pages. Nothing is lost, and nothing is marked against the child.
            </div>
          </div>
          {rows.map((r) => (
            <PaperRow key={r.courseId} childId={child.id} row={r} />
          ))}
          {readiness && <ReadinessCheckin v={readiness} childId={child.id} today={ctx.today} />}
        </div>

        <div className={cx(ui.card, styles.logCard)}>
          <div className={styles.logTitle}>Recent check-ins</div>
          {rec.checkins.length === 0 && <div className={styles.logEmpty}>Nothing checked in yet.</div>}
          {rec.checkins.slice(0, 6).map((l) => (
            <div key={l.id} className={styles.logRow}>
              <span>{l.label}</span>
              <span className={styles.logResult}>{l.result}</span>
            </div>
          ))}
          <div className={styles.logFoot}>These check-ins set the position on the dashboard, the floor rule and the state report.</div>
        </div>
      </div>

      <div className={styles.printQueue}>
        <div className={styles.pqKicker}>What to print</div>
        <div className={styles.pqSub}>Each booklet prints with its answer key at the back.</div>
        {queue.map((q) => (
          <div key={q.label} className={styles.pqGroup}>
            <div className={styles.pqHead}>
              <span className={styles.pqLabel}>{q.label}</span>
              {q.next && <span className={styles.pqNext}>Print next</span>}
            </div>
            <div className={styles.pqText}>{q.sub}</div>
            <div className={styles.pqActions}>
              {q.docs.length > 0 && (
                <PrintLink childId={child.id} docs={q.docs} className={cx(ui.btn, ui.onDark, ui.small)}>
                  {q.printLabel}
                </PrintLink>
              )}
              <span className={styles.pqStatus}>{q.status}</span>
            </div>
          </div>
        ))}
        <div className={styles.pqFoot}>A course’s next term manual unlocks when its term check is recorded. Electives appear once chosen.</div>
      </div>
    </div>
  );
}

function TimeLog({ child, ctx, rec }: { child: Child; ctx: HouseholdContext; rec: ChildRecords }) {
  const day = rec.attendance.find((a) => a.date === ctx.today);
  const routine = day?.routineMins ?? 0;
  const extra = (day?.extra ?? []).reduce((a, x) => a + x.mins, 0);
  const total = routine + extra;
  const need = ctx.minutesPerDay;
  const paper = child.mode === "paper";
  const practice = readinessToday(child, ctx).practiceMins;
  return (
    <div data-noprint="1" id="time" className={cx(ui.card, styles.time)}>
      <div className={styles.timeHead}>
        <div>
          <div className={styles.timeTitle}>Today’s instruction time</div>
          <div className={styles.timeSub}>
            {ctx.rules ? `${ctx.rules.name} asks for 4½ hours a day across ${ctx.requiredDays} days.` : `The record counts 4½ hours a day across ${ctx.requiredDays} days.`} This is your
            attendance record.
          </div>
        </div>
        <div className={styles.timeTotal}>
          <div className={styles.timeBig}>{hm(total)}</div>
          {total >= need ? <div className={styles.timeMet}>4½ hours met</div> : <div className={styles.timeLeft}>{hm(need - total)} to 4½ hours</div>}
        </div>
      </div>
      <div className={styles.timeBar}>
        <div style={{ width: `${Math.min(100, Math.round((total / need) * 100))}%` }} />
      </div>
      <div className={styles.timeCols}>
        <div className={styles.timeCol}>
          <div className={styles.timeColHead}>
            <span className={styles.label}>The routine</span>
            <span className={styles.timeColNum}>{hm(routine)}</span>
          </div>
          <div className={styles.timeNote}>
            {paper
              ? `From the booklets: about ${hm(paperUsualMinutes(child) + practice)} on a usual day${practice ? ", with the test readiness practice" : ""}`
              : "Added up from the items recorded above, using each course’s routine times"}
          </div>
          {paper && <PaperRoutineToggle childId={child.id} on={!!day?.paperRoutine} />}
        </div>
        <div className={styles.timeColWide}>
          <div className={styles.timeColHead}>
            <span className={styles.label}>Also today</span>
            <span className={styles.timeColNum}>{hm(extra)}</span>
          </div>
          <div className={styles.timeNote}>Time the manuals name outside the routine, or any other teaching you did. Add what actually happened.</div>
          <ExtraOptions childId={child.id} options={EXTRA_OPTIONS} />
          {(day?.extra ?? []).length > 0 && (
            <div className={styles.extraList}>
              {day!.extra.map((x, i) => (
                <div key={i} className={styles.extraItem}>
                  <span className={styles.extraLabel}>{x.label}</span>
                  <span className={styles.extraMins}>{x.mins} min</span>
                  <RemoveExtra childId={child.id} index={i} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

