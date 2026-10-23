import type { Metadata } from "next";
import Link from "next/link";
import { Screen } from "@/components/Screen";
import { reserved } from "@/components/marketing/content";
import { gradeLabel } from "@/lib/domain/grades";
import { getSession } from "@/server/session";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Student module" };

export default async function StudentPage() {
  const s = await getSession();
  const me = s?.user.role === "student" ? s.household.children.find((c) => c.id === s.user.childId) : null;
  if (me) {
    // A signed-in student (Grade 6 and up).
    return (
      <Screen label="Student module" tone="dark">
        <div className={styles.stage}>
          <div className={styles.inner}>
            <div className={styles.kicker}>
              The student module · {gradeLabel(me.grade)}
            </div>
            <h1 className={styles.title}>Welcome, {me.name}.</h1>
            <p className={styles.lead}>
              This is where your own work will live: your courses for the week, your memory work and your commonplace book.
            </p>
            <p className={styles.body}>
              {gradeLabel(me.grade)} courses aren&apos;t loaded yet. Until they are, your parent keeps your record, and
              everything they log is waiting here for you.
            </p>
          </div>
        </div>
      </Screen>
    );
  }
  return (
    <Screen label="Student module (locked)" tone="dark">
      <div className={styles.stage}>
        <div className={styles.inner}>
          <div className={styles.grid}>
            <div>
              <div className={styles.kicker}>The student module</div>
              <h1 className={styles.title}>Opens in Grade 6.</h1>
              <p className={styles.lead}>
                Kindergarten through Grade 5 is taught by a parent, at a table, on paper. There is no student login,
                because a child of that age has nothing to gain from one.
              </p>
              <p className={styles.body}>
                Those years are one full turn of the four-year history cycle, twice over — the grammar of every
                subject, learned by voice and by hand. When your child finishes it, they will be ready to direct some
                of their own work, and this module will open for them.
              </p>
              <Link href="/teaching" className={styles.cta}>
                Go to today&apos;s teaching
              </Link>
            </div>
            <div className={styles.kept}>
              <div className={styles.keptHead}>Kept for them, until then</div>
              {reserved.map((r) => (
                <div key={r.name} className={styles.row}>
                  <div className={styles.rowTop}>
                    <span className={styles.rowName}>{r.name}</span>
                    <span className={styles.rowCount}>{r.count}</span>
                  </div>
                  <div className={styles.rowNote}>{r.note}</div>
                </div>
              ))}
              <div className={styles.keptFoot}>
                Everything gathered in these years is waiting in their account. Nothing is lost by starting on paper.
              </div>
            </div>
          </div>
        </div>
      </div>
    </Screen>
  );
}
