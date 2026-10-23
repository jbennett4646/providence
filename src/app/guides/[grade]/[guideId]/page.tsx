import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GuideBody } from "@/components/guide/GuideBody";
import { KeysProvider, KeysSwitch } from "@/components/manual/Keys";
import { cx, ui } from "@/components/ui/Controls";
import { getGuide } from "@/lib/content/guide";
import { getCourseIndex } from "@/lib/content/load";
import { gradeLabel } from "@/lib/domain/grades";
import { requireHousehold } from "@/server/session";
import styles from "./page.module.css";

type Params = { grade: string; guideId: string };

function gradeOf(slug: string): number | null {
  const m = /^grade-(\d{1,2})$/.exec(slug);
  return m ? Number(m[1]) : null;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { grade, guideId } = await params;
  const g = gradeOf(grade) != null ? getGuide(gradeOf(grade)!, guideId) : null;
  return { title: g?.title ?? "Guide" };
}

/** A grade guide, for signed-in families (like the course manuals). */
export default async function GuidePage({ params }: { params: Promise<Params> }) {
  await requireHousehold();
  const { grade: slug, guideId } = await params;
  const grade = gradeOf(slug);
  const guide = grade != null ? getGuide(grade, guideId) : null;
  if (grade == null || !guide) notFound();
  const firstCourse = getCourseIndex(grade)[0]?.id;

  return (
    <main data-screen-label="Guide" className={styles.screen}>
      <KeysProvider>
        <div className={styles.band}>
          <div className={styles.bandIn}>
            <Link href={firstCourse ? `/course/${firstCourse}` : "/course"} className={ui.back}>
              ← Course manuals
            </Link>
            <div className={styles.titleRow}>
              <div>
                <div className={ui.kicker}>{gradeLabel(grade)} · Guide</div>
                <h1 className={styles.title}>{guide.title}</h1>
                <p className={styles.subtitle}>{guide.subtitle}</p>
              </div>
              <div className={styles.actions} data-noprint="1">
                <a href={`/api/guides/${slug}/${guideId}`} target="_blank" rel="noopener" className={cx(ui.btn, ui.dark)}>
                  Download the printable PDF
                </a>
                <span className={styles.keysLabel}>Show answer key</span>
                <KeysSwitch />
              </div>
            </div>
          </div>
        </div>
        <div className={styles.body}>
          <nav className={cx(ui.card, styles.nav)} aria-label="In this guide" data-noprint="1">
            <div className={styles.navTitle}>In this guide</div>
            {guide.sections.map((s) => (
              <a key={s.id} href={`#${s.id}`} className={styles.navItem}>
                {s.title}
              </a>
            ))}
          </nav>
          <article className={cx(ui.card, styles.content)}>
            <GuideBody guide={guide} />
          </article>
        </div>
      </KeysProvider>
    </main>
  );
}
