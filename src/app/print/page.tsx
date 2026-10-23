import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Blocks } from "@/components/manual/Blocks";
import type { Block, Course, Section, Week } from "@/lib/content/schema";
import { getCourse } from "@/lib/content/load";
import { termOfWeek } from "@/lib/content/year";
import { isDailySimple, itemBlocks, itemTitle, masteryInfo, missingQueueKeys, routineItem } from "@/lib/domain/course";
import { gradeLabel } from "@/lib/domain/grades";
import { unlockedThrough } from "@/lib/domain/transitions";
import { requireHousehold } from "@/server/session";
import { PrintToolbar } from "./PrintToolbar";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Print" };

type Doc = { grade: number; courseId: string; doc: string };

type BookSection =
  | { kind: "cover"; title: string; sub: string; note: string; forLine: string; breakBefore: boolean }
  | { kind: "body"; title: string; meta: string; blocks: Block[]; subs: { title: string; meta: string; blocks: Block[] }[]; breakBefore: boolean }
  | { kind: "keys"; keys: { title: string; items: { label: string; text: string }[] }[] };

const noKeys = (blocks: Block[]) => blocks.filter((b) => b.kind !== "answers");

function body(title: string, meta: string, blocks: Block[], subs: Section["subs"] & { meta?: string }[] = [], breakBefore = false): BookSection {
  return { kind: "body", title, meta, blocks: noKeys(blocks), subs: subs.map((s) => ({ title: s.title, meta: (s as { meta?: string }).meta ?? "", blocks: noKeys(s.blocks) })), breakBefore };
}

function weekBook(course: Course, wk: Week): BookSection {
  const miss = missingQueueKeys(course, wk);
  const daily = wk.items.filter((i) => i.track === "daily");
  const simple = isDailySimple(course, daily);
  const blocks: Block[] = [...wk.intro];
  if (simple) blocks.push({ kind: "table", head: ["Day", "Lesson", "What to do"], rows: daily.map((i) => [i.key, i.label, (itemBlocks(course, i)[0] as { text?: string })?.text ?? ""]) });
  if (miss.length) blocks.push({ kind: "p", text: `This week has no Task ${miss.join(", ")} in the manual.` });
  const subs = [...(simple ? [] : daily), ...wk.items.filter((i) => i.track !== "daily")].map((i) => ({
    title: itemTitle(i),
    meta: routineItem(course, i)?.time ?? "",
    blocks: itemBlocks(course, i),
  }));
  return body(`Week ${wk.week}${wk.title ? ` — ${wk.title}` : ""}`, `Term ${termOfWeek(wk.week)} · Week ${wk.week} of 36`, blocks, subs, true);
}

const weekKeys = (wk: Week) => ({
  title: `Week ${wk.week}${wk.title ? ` — ${wk.title}` : ""}`,
  items: wk.items.filter((i) => i.answers.length).map((i) => ({ label: itemTitle(i), text: i.answers.join(" · ") })),
});

function booklet(course: Course, doc: string, forLine: string, first: boolean): BookSection[] {
  const out: BookSection[] = [];
  const cover = (title: string, sub: string, note: string) => out.push({ kind: "cover", title, sub, note, forLine, breakBefore: !first });
  const keys = (k: ReturnType<typeof weekKeys>[]) => {
    const withItems = k.filter((x) => x.items.length);
    if (withItems.length) out.push({ kind: "keys", keys: withItems });
  };
  if (doc === "plan") {
    cover(`${course.course} · Year Plan`, `${gradeLabel(course.grade)} · 36 weeks in six terms`, "Read once at the start of the year.");
    for (const s of course.plan.sections) out.push(body(s.title, "", s.blocks, s.subs));
  } else if (doc.startsWith("t")) {
    const T = course.terms[Number(doc.slice(1)) - 1];
    const mi = masteryInfo(course, T.term);
    cover(`${course.course} · Term ${T.term} Manual`, T.title, `Weeks ${T.weeksRange[0]}–${T.weeksRange[1]} · answer key at the back`);
    out.push(body("Term at a glance", `Weeks ${T.weeksRange[0]}–${T.weeksRange[1]}`, T.glance));
    for (const r of T.reference) out.push(body(r.title, "", r.blocks, r.subs));
    for (const w of T.weeks) out.push(weekBook(course, w));
    T.after.forEach((r, i) => out.push(body(r.title, "", r.blocks, r.subs, i === 0)));
    out.push(
      body(
        "Weekly check-in record",
        "Enter each week on the site",
        [
          { kind: "p", text: "At the end of each week, tick one box, then enter the same on the site (Teaching · On paper). It takes one tap." },
          { kind: "table", head: ["Week", "Done", "Carried over", "Note"], rows: T.weeks.map((w) => [`Week ${w.week}`, "☐", "☐", ""]) },
          {
            kind: "p",
            text: mi.scored
              ? `Term check (week ${T.weeksRange[1]}): score ____ of ${mi.of}${mi.chants ? "   ·   chants said perfectly ☐" : ""}   ·   date ________`
              : `End of term (week ${T.weeksRange[1]}): review done ☐   ·   date ________`,
          },
        ],
        [],
        true,
      ),
    );
    keys(T.weeks.map(weekKeys));
  } else {
    const T = course.terms[Number(doc.slice(1)) - 1];
    const gw = T.weeks[T.weeks.length - 1];
    const vocab = T.reference.find((r) => /vocabulary|word/i.test(r.title));
    cover(`${course.course} · Review Week`, `Term ${T.term} material, before Term ${T.term + 1}`, "Answer key at the back");
    out.push(
      body("The review week", "", [
        {
          kind: "p",
          text: `The Term ${T.term} check was below mastery, so Term ${T.term + 1} opens with this week. Go back over the term’s review lesson, drill what slipped, then rework the check. Enter the week on the site when it is done.`,
        },
      ]),
    );
    out.push(weekBook(course, gw));
    if (vocab) out.push(body(vocab.title, `Term ${T.term}`, vocab.blocks, vocab.subs, true));
    keys([weekKeys(gw)]);
  }
  return out;
}

export default async function PrintPage({ searchParams }: { searchParams: Promise<{ child?: string; docs?: string }> }) {
  const sp = await searchParams;
  const household = await requireHousehold();
  const child = household.children.find((c) => c.id === sp.child);
  if (!child) notFound();

  const docs: Doc[] = [];
  for (const part of (sp.docs ?? "").split(",").slice(0, 40)) {
    const [g, courseId, doc] = part.split(":");
    const grade = Number(g);
    const course = getCourse(grade, courseId ?? "");
    if (!course || !/^(plan|t[1-6]|r[1-5])$/.test(doc ?? "")) continue;
    const e = child.enrollments.find((x) => x.grade === grade && x.courseId === courseId);
    const n = Number(doc.slice(1));
    const open = e ? unlockedThrough(e.pos, e.reviewTerm) : 1;
    // Term manuals print only once they're unlocked; review sheets only for a term already checked.
    if (doc.startsWith("t") && n > open) continue;
    if (doc.startsWith("r") && !(e?.reviewTerm === n || n < open)) continue;
    docs.push({ grade, courseId: course.id, doc });
  }
  if (!docs.length) notFound();

  const sections = docs.flatMap((d, i) => booklet(getCourse(d.grade, d.courseId)!, d.doc, `${child.name} · ${gradeLabel(d.grade)}`, i === 0));
  const title = docs.length === 1 ? sections[0].kind === "cover" ? sections[0].title : "Booklet" : `${docs.length} booklets`;

  return (
    <div className={styles.page}>
      <PrintToolbar childId={child.id} docs={docs} title={title} />
      <div className={styles.book}>
        {sections.map((s, i) => {
          if (s.kind === "cover")
            return (
              <section key={i} className={styles.cover} style={{ breakBefore: s.breakBefore ? "page" : "auto" }}>
                <div className={styles.coverBrand}>PROVIDENCE HOME ACADEMY</div>
                <div className={styles.coverRule} />
                <div className={styles.coverTitle}>{s.title}</div>
                <div className={styles.coverSub}>{s.sub}</div>
                <div className={styles.coverFor}>{s.forLine}</div>
                <div className={styles.coverNote}>{s.note}</div>
              </section>
            );
          if (s.kind === "keys")
            return (
              <section key={i} className={styles.keys}>
                <div className={styles.head}>
                  <span className={styles.headTitle}>Answer key</span>
                  <span className={styles.headMeta}>Parent&apos;s copy · remove before teaching</span>
                </div>
                {s.keys.map((k, j) => (
                  <div key={j} className={styles.keyWeek}>
                    <div className={styles.keyTitle}>{k.title}</div>
                    {k.items.map((it, n) => (
                      <div key={n} className={styles.keyItem}>
                        <span className={styles.keyLabel}>{it.label}</span>
                        {it.text}
                      </div>
                    ))}
                  </div>
                ))}
              </section>
            );
          return (
            <section key={i} className={styles.body} style={{ breakBefore: s.breakBefore ? "page" : "auto" }}>
              {s.title && (
                <div className={styles.head}>
                  <span className={styles.headTitle}>{s.title}</span>
                  <span className={styles.headMeta}>{s.meta}</span>
                </div>
              )}
              <Blocks blocks={s.blocks} print />
              {s.subs.map((sub, j) => (
                <div key={j} className={styles.sub}>
                  <div className={styles.subHead}>
                    <span className={styles.subTitle}>{sub.title}</span>
                    <span className={styles.subMeta}>{sub.meta}</span>
                  </div>
                  <Blocks blocks={sub.blocks} print />
                </div>
              ))}
            </section>
          );
        })}
      </div>
    </div>
  );
}
