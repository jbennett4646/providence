import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SectionView } from "@/components/manual/Blocks";
import { KeysProvider, KeysSwitch } from "@/components/manual/Keys";
import { PrintLink } from "@/components/teaching/PrintLink";
import { cx, ui } from "@/components/ui/Controls";
import type { Block, Course, Section } from "@/lib/content/schema";
import { GUIDES } from "@/lib/content/guide";
import { getCourse, getCourseIndex, getWeek } from "@/lib/content/load";
import { isGateWeek, termOfWeek } from "@/lib/content/year";
import { isDailySimple, isSplit, itemBlocks, itemBlocksWithKeys, itemKey, itemTitle, missingQueueKeys, routineItem, trackOf } from "@/lib/domain/course";
import { gradeLabel } from "@/lib/domain/grades";
import { unlockedThrough } from "@/lib/domain/transitions";
import { requireHousehold, selectedChild } from "@/server/session";
import { householdContext, loadChildRecords } from "@/server/state";
import { childProgress } from "@/server/views";
import styles from "./page.module.css";

type Params = { courseId: string };
type Search = { tab?: string; item?: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { courseId } = await params;
  const c = getCourse(3, courseId);
  return { title: c ? c.course : "Course manual" };
}

type View = { kicker: string; title: string; sections: (Omit<Section, "subs"> & { meta?: string; subs: { title: string; blocks: Block[] }[] })[]; gap: string };

function weekView(course: Course, week: number): View {
  const wk = getWeek(course, week)!;
  const T = termOfWeek(week);
  const miss = missingQueueKeys(course, wk);
  const daily = wk.items.filter((i) => i.track === "daily");
  const sections: View["sections"] = [];
  if (wk.intro.length) sections.push({ title: "This week", blocks: wk.intro, subs: [] });
  if (daily.length) {
    sections.push(
      isDailySimple(course, daily)
        ? {
            title: "Daily core",
            meta: `${daily.length} a week, in order`,
            blocks: [{ kind: "table", head: ["Day", "Lesson", "What to do"], rows: daily.map((i) => [i.key, i.label, (itemBlocks(course, i)[0] as { text?: string })?.text ?? ""]) }],
            subs: [],
          }
        : { title: "Daily core", meta: `${daily.length} a week, in order`, blocks: [], subs: daily.map((i) => ({ title: itemTitle(i), blocks: itemBlocksWithKeys(course, i) })) },
    );
  }
  for (const i of wk.items.filter((x) => x.track !== "daily")) {
    sections.push({ title: itemTitle(i), meta: routineItem(course, i)?.time ?? "", blocks: itemBlocksWithKeys(course, i), subs: [] });
  }
  const q = trackOf(course, "queue");
  return {
    kicker: `Term ${T} · week ${week - (T - 1) * 6} of 6 · week ${week} of 36`,
    title: `Week ${week}${wk.title ? ` — ${wk.title}` : ""}`,
    sections,
    gap: miss.length && q ? `The manual has no Task ${miss.join(", ")} this week. This week counts ${q.perWeek - miss.length} queue tasks.` : "",
  };
}

export default async function CoursePage({ params, searchParams }: { params: Promise<Params>; searchParams: Promise<Search> }) {
  const { courseId } = await params;
  const sp = await searchParams;
  const household = await requireHousehold();
  const ctx = householdContext(household);
  const child = await selectedChild(household.children);
  const grade = child?.grade ?? 3;
  const course = getCourse(grade, courseId) ?? getCourse(3, courseId);
  if (!course) notFound();

  const e = child?.enrollments.find((x) => x.courseId === course.id && x.grade === course.grade && x.active) ?? null;
  const rec = child ? await loadChildRecords(child.id, ctx.today) : null;
  const pos = e?.pos ?? 1;
  const finished = pos > 36;
  const cW = Math.min(pos, 36);
  const cT = termOfWeek(cW);
  const unlocked = e ? unlockedThrough(pos, e.reviewTerm) : 1;
  const tab = Math.max(0, Math.min(6, Number(sp.tab ?? (e ? cT : 0)) || 0));
  const locked = tab > unlocked;
  const term = tab ? course.terms[tab - 1] : null;
  const item = sp.item ?? (term ? (e && tab === cT ? `w${cW}` : "glance") : "plan");
  const floorId = child ? childProgress(child).floor?.course.courseId : null;
  const href = (t: number, it?: string) => `/course/${course.id}?tab=${t}${it ? `&item=${it}` : ""}`;

  let view: View = { kicker: "", title: "", sections: [], gap: "" };
  if (!term) {
    view = {
      kicker: "Year plan · read once at the start of the year",
      title: course.plan.title,
      sections: course.plan.sections.map((s) => ({ ...s, subs: s.subs })),
      gap: "",
    };
  } else if (!locked) {
    if (item === "glance") view = { kicker: `Term ${term.term} · weeks ${term.weeksRange[0]}–${term.weeksRange[1]}`, title: "Term at a glance", sections: [{ title: "", blocks: term.glance, subs: [] }], gap: "" };
    else if (/^(ref|after)\d+$/.test(item)) {
      const r = item.startsWith("ref") ? term.reference[Number(item.slice(3))] : term.after[Number(item.slice(5))];
      view = { kicker: `Term ${term.term} manual`, title: r?.title ?? "", sections: r ? [{ ...r, title: "" }] : [], gap: "" };
    } else {
      const w = Number(item.slice(1));
      view = weekView(course, w >= term.weeksRange[0] && w <= term.weeksRange[1] ? w : term.weeksRange[0]);
    }
  }

  const index = getCourseIndex(course.grade);
  const done = e && rec ? rec.records.filter((r) => r.grade === e.grade && r.courseId === course.id && r.week === cW).map((r) => r.track[0] + r.itemKey) : [];
  const wkNow = getWeek(course, cW);
  const gatesFor = child?.gates.filter((g) => g.courseId === course.id && g.grade === course.grade) ?? [];
  const gateText = gatesFor.map((g) => `Term ${g.term}: ${g.score != null ? `${g.score} of ${g.of}${g.pass ? ", mastery." : ", below mastery."}` : "recorded."}`).join(" ");
  const printDoc = tab === 0 ? "plan" : `t${tab}`;
  const name = child?.name ?? "Your child";

  return (
    <main data-screen-label="Course manual" className={styles.screen}>
      <KeysProvider>
        <div className={styles.band}>
          <div className={styles.bandIn}>
            <Link href="/parent" className={ui.back}>
              ← Dashboard
            </Link>
            <div className={styles.picker}>
              {index.map((c) => (
                <Link key={c.id} href={`/course/${c.id}`} className={cx(ui.pill, styles.pickerPill, c.id === course.id && ui.pillOn)}>
                  {getCourse(course.grade, c.id)?.course ?? c.course}
                </Link>
              ))}
              {(GUIDES[course.grade] ?? []).map((g) => (
                <Link key={g.id} href={`/guides/grade-${course.grade}/${g.id}`} className={cx(ui.pill, styles.pickerPill, styles.guidePill)}>
                  {g.title} · guide
                </Link>
              ))}
            </div>
            <div className={styles.titleRow}>
              <div>
                <div className={ui.kicker}>
                  {gradeLabel(course.grade)} · Course {course.number} · {name}
                </div>
                <div className={styles.titleLine}>
                  <h1 className={styles.title}>{course.course}</h1>
                  {isSplit(course) && <span className={styles.split}>Daily drill · Weekly lesson</span>}
                </div>
              </div>
              <div className={styles.titleActions}>
                {child && !locked ? (
                  <PrintLink childId={child.id} docs={[{ grade: course.grade, courseId: course.id, doc: printDoc }]} className={cx(ui.btn, ui.dark, styles.printBtn)}>
                    {tab === 0 ? "Print the year plan" : `Print the Term ${tab} manual`}
                  </PrintLink>
                ) : (
                  <span className={cx(ui.btn, ui.inactive, styles.printBtn)}>{tab === 0 ? "Print the year plan" : `Print the Term ${tab} manual`}</span>
                )}
                <span className={styles.keysLabel}>Show answer keys</span>
                <KeysSwitch />
              </div>
            </div>
            <div className={styles.tabs}>
              <Link href={href(0, "plan")} className={cx(styles.tab, tab === 0 && styles.tabOn)}>
                <span className={styles.tabLabel}>Year plan</span>
                <span className={styles.tabSub}>read once</span>
              </Link>
              {course.terms.map((t) => (
                <Link key={t.term} href={href(t.term)} className={cx(styles.tab, tab === t.term && styles.tabOn, t.term > unlocked && styles.tabLocked)}>
                  <span className={styles.tabLabel}>Term {t.term}</span>
                  <span className={styles.tabSub}>
                    Wks {t.weeksRange[0]}–{t.weeksRange[1]}
                  </span>
                  {e && !finished && t.term === cT && <span className={styles.tabDot} />}
                  {t.term > unlocked && <span className={styles.lock}>Locked</span>}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.body}>
          {term && !locked && (
            <nav className={cx(ui.card, styles.nav)}>
              <div className={styles.navTitle}>
                Term {term.term}
                {term.title ? ` · ${term.title}` : ""}
              </div>
              <NavItem href={href(tab, "glance")} on={item === "glance"} label="Term at a glance" />
              {term.reference.map((r, i) => (
                <NavItem key={`r${i}`} href={href(tab, `ref${i}`)} on={item === `ref${i}`} label={r.title} />
              ))}
              <div className={styles.navGap} />
              {term.weeks.map((w) => (
                <NavItem key={w.week} href={href(tab, `w${w.week}`)} on={item === `w${w.week}`} num={w.week} label={w.title || `Week ${w.week}`} now={!!e && !finished && w.week === cW} />
              ))}
              <div className={styles.navGap} />
              {term.after.map((r, i) => (
                <NavItem key={`a${i}`} href={href(tab, `after${i}`)} on={item === `after${i}`} label={r.title} />
              ))}
            </nav>
          )}

          <div className={cx(ui.card, styles.content)}>
            {locked && term ? (
              <div className={styles.viewHead}>
                <div className={styles.viewKicker}>Term {term.term} · locked</div>
                <div className={styles.viewTitle}>
                  Term {term.term}
                  {term.title ? ` · ${term.title}` : ""}
                </div>
                <p className={styles.lockedNote}>
                  {e?.reviewTerm && term.term === e.reviewTerm + 1
                    ? `Term ${term.term} opens once the Term ${e.reviewTerm} review week is done.`
                    : `Term ${term.term} opens when the Term ${term.term - 1} check is recorded. Each term's manual stays closed until the one before it is finished, so the work is taught in order.`}
                </p>
              </div>
            ) : (
              <>
                <div className={styles.viewHead}>
                  <div className={styles.viewKicker}>{view.kicker}</div>
                  <div className={styles.viewTitle}>{view.title}</div>
                  {view.gap && <div className={styles.gapNote}>{view.gap}</div>}
                </div>
                {view.sections.map((s, i) => (
                  <SectionView key={i} section={s} highlightTerm={tab === 0 && e ? cT : null} />
                ))}
              </>
            )}
          </div>

          <div className={styles.side}>
            <div className={styles.posCard}>
              <div className={styles.posKicker}>{name} · position</div>
              <div className={styles.posTitle}>
                {!e ? "Not started" : finished ? `${gradeLabel(course.grade)} finished` : e.reviewTerm ? `Review week · Term ${e.reviewTerm}` : `Term ${cT} · Week ${cW}`}
              </div>
              <div className={styles.posDetail}>
                {!e
                  ? course.elective
                    ? "An elective. Switch it on from the dashboard to start at week 1."
                    : "Not enrolled."
                  : finished
                    ? `${name} has finished this course for ${gradeLabel(course.grade)}.`
                    : `${child?.mode === "paper" ? "Taught on paper, with weekly check-ins. " : wkNow ? `${wkNow.items.filter((i) => done.includes(itemKey(i))).length} of ${wkNow.items.length} recorded this week. ` : ""}${36 - cW + 1} weeks remain in this course.${course.id === floorId ? ` It is the floor for ${gradeLabel(course.grade)}.` : ""}`}
              </div>
              {e && !finished && (
                <Link href={href(cT, `w${cW}`)} className={styles.posLink}>
                  Open this week →
                </Link>
              )}
              {e && (
                <div className={styles.posGate}>
                  {gateText || "No term checks recorded on the site yet."}
                  {!finished && (isGateWeek(cW) ? ` Term ${cT} check is this week.` : ` Term ${cT} ends in week ${cT * 6}.`)}
                </div>
              )}
            </div>
            <div className={cx(ui.card, styles.routine)}>
              <div className={styles.routineTitle}>The weekly routine</div>
              <div className={styles.routineSub}>{course.cadence}</div>
              {course.tracks.map((t) => (
                <div key={t.track}>
                  <div className={styles.routineLabel}>{t.label}</div>
                  {t.items.map((it) => (
                    <div key={it.key} className={styles.routineRow}>
                      <span className={styles.routineKey}>{it.key}</span>
                      <span className={styles.routineName}>{it.label}</span>
                      <span className={styles.routineTime}>{it.time}</span>
                    </div>
                  ))}
                </div>
              ))}
              {course.orderRules.length > 0 && (
                <>
                  <div className={styles.routineLabel}>Order</div>
                  {course.orderRules.map((o, i) => (
                    <div key={i} className={styles.order}>
                      {o}
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      </KeysProvider>
    </main>
  );
}

function NavItem({ href, on, label, num, now }: { href: string; on: boolean; label: string; num?: number; now?: boolean }) {
  return (
    <Link href={href} className={cx(styles.navItem, on && styles.navOn)} aria-current={on ? "page" : undefined}>
      <span className={styles.navNum}>{num ?? ""}</span>
      <span className={styles.navLabel}>{label}</span>
      {now && <span className={styles.navNow}>Now</span>}
    </Link>
  );
}
