import type { Metadata } from "next";
import Link from "next/link";
import { cx, ui } from "@/components/ui/Controls";
import { MON_SAT } from "@/lib/domain/calendar";
import { gradeLabel } from "@/lib/domain/grades";
import { getDb } from "@/db/client";
import { PLANS, subscriptionOpen } from "@/lib/domain/billing";
import { STUDENT_GRADE, studentLogins } from "@/server/auth/accounts";
import { billingEnabled } from "@/server/billing/stripe";
import { requireHousehold, requireParent } from "@/server/session";
import { SchoolDaysChoice } from "../calendar/client";
import { AddChildForm, ChildForm, HouseholdForm, PasswordForm, StudentLoginForm } from "./client";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const h = await requireHousehold();
  const { user } = await requireParent();
  const logins = await studentLogins(await getDb(), h.id);
  const older = h.children.filter((c) => c.grade >= STUDENT_GRADE);
  const mf = [...h.schoolDays].sort().join(",") !== MON_SAT.join(",");
  return (
    <main data-screen-label="Settings" className={styles.screen}>
      <div className={styles.wrap}>
        <Link href="/parent" className={ui.back}>
          ← Dashboard
        </Link>
        <div className={ui.kicker}>Household</div>
        <h1 className={styles.title}>Settings</h1>

        <section className={cx(ui.card, styles.box)}>
          <div className={styles.boxTitle}>The household</div>
          <HouseholdForm name={h.name} state={h.state} />
        </section>

        <section id="children" className={cx(ui.card, styles.box)}>
          <div className={styles.boxTitle}>Children</div>
          <div className={styles.boxSub}>One household covers every child. Students get their own login from Grade 6.</div>
          {h.children.map((c) => (
            <ChildForm key={c.id} id={c.id} name={c.name} grade={gradeLabel(c.grade)} mode={c.mode} priorDays={c.priorDays} canRemove={h.children.length > 1} />
          ))}
          <div className={styles.label}>Add a child</div>
          <AddChildForm />
        </section>

        <section className={cx(ui.card, styles.box)}>
          <div className={styles.boxTitle}>School days and holidays</div>
          <div className={styles.row}>
            <span>School week</span>
            <SchoolDaysChoice value={mf ? "mf" : "ms"} />
          </div>
          <div className={styles.boxSub}>
            The first day, federal holidays you teach on, and family breaks are set on the <Link href="/calendar">calendar</Link>. Sick and travel days are
            marked on the day from Teaching, five a term.
          </div>
        </section>

        <section className={cx(ui.card, styles.box)}>
          <div className={styles.boxTitle}>Student logins</div>
          <div className={styles.boxSub}>From Grade {STUDENT_GRADE}, a child can sign in with their own username to the student module. Younger children have no login; you see everything.</div>
          {older.length === 0 && <div className={styles.boxSub}>No children in Grade {STUDENT_GRADE} or above yet.</div>}
          {older.map((c) => (
            <StudentLoginForm key={c.id} childId={c.id} name={c.name} username={logins.find((l) => l.childId === c.id)?.username ?? null} />
          ))}
        </section>

        <section className={cx(ui.card, styles.box)}>
          <div className={styles.boxTitle}>Your account</div>
          <div className={styles.boxSub}>Signed in as {user.email}.</div>
          <PasswordForm />
        </section>

        <section className={cx(ui.card, styles.box)}>
          <div className={styles.boxTitle}>Plan and billing</div>
          <div className={styles.boxSub}>
            {!billingEnabled()
              ? "Payments aren’t switched on yet, so everything is open and nothing is charged."
              : subscriptionOpen(h.subscriptionStatus) && h.plan
                ? `${PLANS[h.plan].name}, $${PLANS[h.plan].price} a month.${h.cancelAtPeriodEnd ? " Cancelled at the end of this period." : ""}`
                : h.coopId
                  ? "Covered by your parish or co-op."
                  : "No plan yet."}{" "}
            Per household, not per child. Cancel in any month.
          </div>
          <Link href="/billing" className={ui.link}>
            Open plan and billing
          </Link>
        </section>
      </div>
    </main>
  );
}
