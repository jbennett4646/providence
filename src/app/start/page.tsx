import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import styles from "@/components/auth/Auth.module.css";
import { Screen } from "@/components/Screen";
import { cx, ui } from "@/components/ui/Controls";
import { getCourse, getCourseIndex } from "@/lib/content/load";
import { termOfWeek } from "@/lib/content/year";
import { MON_SAT } from "@/lib/domain/calendar";
import { todayIn } from "@/lib/domain/dates";
import { gradeLabel } from "@/lib/domain/grades";
import { getSession } from "@/server/session";
import { savePlacement, finish } from "./actions";
import { AccountForm, AddChildForm, CalendarForm, ModeChoice, RemoveChild } from "./forms";
import own from "./page.module.css";

export const metadata: Metadata = { title: "Set up your household" };

const STEPS = [
  ["account", "Household"],
  ["children", "Children"],
  ["placement", "Placement"],
  ["calendar", "School year"],
  ["teaching", "Screen or paper"],
] as const;
type Step = (typeof STEPS)[number][0];

function Steps({ current }: { current: Step }) {
  const at = STEPS.findIndex(([k]) => k === current);
  return (
    <ol className={own.steps}>
      {STEPS.map(([k, label], i) => (
        <li key={k} className={cx(own.step, i === at && own.stepOn, i < at && own.stepDone)}>
          <span className={own.stepNum}>{i + 1}</span>
          {label}
        </li>
      ))}
    </ol>
  );
}

export default async function StartPage({ searchParams }: { searchParams: Promise<{ step?: string; invite?: string }> }) {
  const sp = await searchParams;
  const s = await getSession();
  if (s?.user.role === "student") redirect("/student");
  if (s?.household.onboardedAt) redirect("/parent");

  if (!s) {
    return (
      <Screen label="Set up">
        <div className={cx(styles.wrap, styles.wide)}>
          <Steps current="account" />
          <div className={styles.kicker}>Begin enrollment</div>
          <h1 className={styles.title}>Set up your household</h1>
          <p className={styles.lede}>One parent account covers the household and every child in it. You’ll add the children next, then place them and set the school year.</p>
          <AccountForm invite={sp.invite ?? ""} />
          <p className={styles.foot}>
            Already have an account? <Link href="/sign-in">Sign in</Link>.
          </p>
        </div>
      </Screen>
    );
  }

  const h = s.household;
  const wanted = (STEPS.find(([k]) => k === sp.step)?.[0] ?? "children") as Step;
  const step: Step = wanted === "account" ? "children" : h.children.length ? wanted : "children";
  const today = todayIn(h.timezone);

  return (
    <Screen label="Set up">
      <div className={cx(styles.wrap, styles.wide)}>
        <Steps current={step} />
        {step === "children" && (
          <>
            <div className={styles.kicker}>{h.name}</div>
            <h1 className={styles.title}>Your children</h1>
            <p className={styles.lede}>Add each child you’ll teach. Kindergarten to Grade 5 is taught by a parent; from Grade 6 a child can have their own login.</p>
            {h.children.length > 0 && (
              <div className={cx(ui.card, own.list)}>
                {h.children.map((c) => (
                  <div key={c.id} className={own.listRow}>
                    <span className={own.listName}>{c.name}</span>
                    <span className={own.listMeta}>{gradeLabel(c.grade)}</span>
                    {!getCourseIndex(c.grade).length && <span className={own.listNote}>{gradeLabel(c.grade)} manuals aren’t loaded yet</span>}
                    <RemoveChild id={c.id} />
                  </div>
                ))}
              </div>
            )}
            <AddChildForm />
            {h.children.length > 0 && (
              <div className={own.next}>
                <Link href="/start?step=placement" className={cx(ui.btn, ui.dark)}>
                  Continue to placement
                </Link>
              </div>
            )}
          </>
        )}

        {step === "placement" && (
          <>
            <div className={styles.kicker}>Placement</div>
            <h1 className={styles.title}>Where each course starts</h1>
            <p className={styles.lede}>
              Each course starts at the term your child is ready for. Most children start every course at Term 1. If a child has already covered part of a course, read the
              term’s “at a glance” page in the manual and start at the first term they can’t yet do. The term checks will show quickly if a placement is off.
            </p>
            <form action={savePlacement}>
              {h.children.map((c) => {
                const index = getCourseIndex(c.grade);
                if (!index.length)
                  return (
                    <div key={c.id} className={cx(ui.card, own.place)}>
                      <div className={own.placeName}>{c.name}</div>
                      <p className={own.listNote}>{gradeLabel(c.grade)} manuals aren’t loaded yet; placement opens when they are.</p>
                    </div>
                  );
                return (
                  <div key={c.id} className={cx(ui.card, own.place)}>
                    <div className={own.placeName}>
                      {c.name} · {gradeLabel(c.grade)}
                    </div>
                    {index
                      .filter((x) => !x.elective)
                      .map((x) => {
                        const course = getCourse(c.grade, x.id)!;
                        const e = c.enrollments.find((en) => en.courseId === x.id);
                        return (
                          <label key={x.id} className={own.placeRow}>
                            <span className={own.placeCourse}>{course.course}</span>
                            <select className={cx(ui.input, own.placeSelect)} name={`term:${c.id}:${x.id}`} defaultValue={termOfWeek(Math.min(e?.pos ?? 1, 36))}>
                              {course.terms.map((t) => (
                                <option key={t.term} value={t.term}>
                                  Term {t.term}
                                  {t.title ? ` · ${t.title.length > 48 ? t.title.slice(0, 46) + "…" : t.title}` : ""}
                                </option>
                              ))}
                            </select>
                          </label>
                        );
                      })}
                    {index.some((x) => x.elective) && (
                      <div className={own.electives}>
                        <div className={styles.label}>Electives · optional, not graded</div>
                        {index
                          .filter((x) => x.elective)
                          .map((x) => (
                            <label key={x.id} className={own.elective}>
                              <input type="checkbox" name={`el:${c.id}:${x.id}`} defaultChecked={c.enrollments.some((e) => e.courseId === x.id && e.active)} />
                              {getCourse(c.grade, x.id)!.course}
                            </label>
                          ))}
                      </div>
                    )}
                  </div>
                );
              })}
              <div className={own.next}>
                <Link href="/start?step=children" className={ui.quiet}>
                  Back
                </Link>
                <button type="submit" className={cx(ui.btn, ui.dark)}>
                  Continue to the school year
                </button>
              </div>
            </form>
          </>
        )}

        {step === "calendar" && (
          <>
            <div className={styles.kicker}>The school year</div>
            <h1 className={styles.title}>When school starts</h1>
            <p className={styles.lede}>
              The year starts on your first day here and runs 180 school days, around federal holidays and the usual breaks (you can change both on the calendar). Joining
              midyear? Start today, and enter the school days each child was already taught this year.
            </p>
            <CalendarForm
              start={h.calStart ?? today}
              week={[...h.schoolDays].sort().join(",") === MON_SAT.join(",") ? "ms" : "mf"}
              kids={h.children.map((c) => ({ id: c.id, name: c.name, prior: c.priorDays }))}
            />
          </>
        )}

        {step === "teaching" && (
          <>
            <div className={styles.kicker}>Screen or paper</div>
            <h1 className={styles.title}>How you’ll teach</h1>
            <p className={styles.lede}>You can switch any child at any time, from the top of the Teaching page.</p>
            <form action={finish}>
              {h.children.map((c) => (
                <ModeChoice key={c.id} id={c.id} name={c.name} initial={c.mode} />
              ))}
              <div className={own.next}>
                <Link href="/start?step=calendar" className={ui.quiet}>
                  Back
                </Link>
                <button type="submit" className={cx(ui.btn, ui.dark)}>
                  Finish setting up
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </Screen>
  );
}
