import type { Metadata } from "next";
import Link from "next/link";
import { cx, ui } from "@/components/ui/Controls";
import { fmtLong } from "@/lib/domain/dates";
import { declarationModel, declarationStatus, reportNotesFor, reportSubjects } from "@/server/forms/model";
import { requireHousehold } from "@/server/session";
import { householdContext } from "@/server/state";
import { DetailsForm, FiledControl, SubjectNote } from "./client";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "State forms" };

export default async function FormsPage() {
  const h = await requireHousehold();
  const ctx = householdContext(h);
  const georgia = ctx.rules?.code === "GA";
  const dm = await declarationModel(h, ctx);
  const status = await declarationStatus(h, ctx);
  const subjects = reportSubjects(ctx);
  const notes = await Promise.all(h.children.map(async (c) => [c.id, await reportNotesFor(c.id, ctx.calendar.start)] as const));
  const noteMap = new Map(notes);

  return (
    <main data-screen-label="State forms" className={styles.screen}>
      <div className={styles.wrap}>
        <Link href="/records" className={ui.back}>
          ← Records
        </Link>
        <div className={ui.kicker}>
          {h.name} · School year {dm.schoolYear}
        </div>
        <h1 className={styles.title}>State forms</h1>
        <p className={styles.lede}>
          {georgia
            ? "Georgia asks for two things each year: a Declaration of Intent, filed with the state, and an annual progress report in each required subject, which you keep. Both are prepared here from your record."
            : "State forms cover Georgia for now. The annual progress report below works anywhere; tell us your state and we’ll add its forms."}
        </p>

        <div className={styles.cols}>
          <div className={styles.col}>
            {georgia && (
              <section className={cx(ui.card, styles.box)}>
                <div className={styles.boxHead}>
                  <span className={styles.boxTitle}>Declaration of Intent</span>
                  <span className={cx(styles.badge, status.filed ? styles.badgeOk : styles.badgeDue)}>
                    {status.filed ? `Filed ${fmtLong(status.filed.filedOn)}` : `Due ${fmtLong(status.due)}`}
                  </span>
                </div>
                <p className={styles.muted}>
                  Due within 30 days of starting home study, then by 1 September each year. It lists each student and their age, where home study takes place, and the
                  twelve-month school year ({dm.period.from} to {dm.period.to}).
                </p>
                {dm.missing.length ? (
                  <p className={styles.missing}>Before it can be printed, add {dm.missing.join(", ")} below.</p>
                ) : (
                  <div className={styles.preview}>
                    {dm.students.map((s) => (
                      <div key={s.name} className={styles.previewRow}>
                        <span>{s.name}</span>
                        <span>
                          Age {s.age} · {s.grade}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <div className={styles.actions}>
                  {dm.missing.length ? (
                    <span className={cx(ui.btn, ui.inactive)}>Download the declaration</span>
                  ) : (
                    <a href="/api/forms/declaration" target="_blank" rel="noopener" className={cx(ui.btn, ui.dark)}>
                      Download the declaration
                    </a>
                  )}
                </div>
                <p className={styles.muted}>Sign it, then file it with the Georgia Department of Education, online or by mail. Keep a copy.</p>
                <FiledControl filedOn={status.filed ? fmtLong(status.filed.filedOn) : null} today={ctx.today} />
              </section>
            )}

            <section className={cx(ui.card, styles.box)}>
              <div className={styles.boxTitle}>{georgia ? "Details for the declaration" : "Household details"}</div>
              <DetailsForm
                d={{
                  parentName: h.parentName ?? "",
                  addressLine1: h.addressLine1 ?? "",
                  addressLine2: h.addressLine2 ?? "",
                  city: h.city ?? "",
                  county: h.county ?? "",
                  postalCode: h.postalCode ?? "",
                  phone: h.phone ?? "",
                  state: h.state,
                  children: h.children.map((c) => ({ id: c.id, name: c.name, birthDate: c.birthDate ?? "" })),
                }}
              />
            </section>
          </div>

          <div className={styles.col}>
            {h.children.map((c) => (
              <section key={c.id} className={cx(ui.card, styles.box)}>
                <div className={styles.boxHead}>
                  <span className={styles.boxTitle}>{c.name} · annual progress report</span>
                </div>
                <p className={styles.muted}>
                  Attendance, each course’s position and its term checks are filled in from the record. Add a few sentences of your own for each subject; they print on the
                  report.{georgia ? " Keep it for three years; it isn’t filed." : ""}
                </p>
                {subjects.map((s) => (
                  <div key={s.name} className={styles.subject}>
                    <div className={styles.subjectName}>{s.name}</div>
                    <SubjectNote childId={c.id} subject={s.name} initial={noteMap.get(c.id)?.get(s.name) ?? ""} />
                  </div>
                ))}
                <div className={styles.actions}>
                  <a href={`/api/forms/report?child=${c.id}`} target="_blank" rel="noopener" className={cx(ui.btn, ui.dark)}>
                    Download the report
                  </a>
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
