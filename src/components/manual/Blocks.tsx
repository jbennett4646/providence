import type { Block, Section } from "@/lib/content/schema";
import { AnswerKey } from "./Keys";
import styles from "./Blocks.module.css";

/** A table's first row is a header only when every cell is short; otherwise it's data. */
function tableShape(b: Extract<Block, { kind: "table" }>) {
  const hasHead = b.head.every((c) => c.length < 30);
  return { head: hasHead ? b.head : null, rows: hasHead ? b.rows : [b.head, ...b.rows] };
}

type BlocksProps = {
  blocks: Block[];
  /** Highlight year-plan rows for this term ("Term 2 (…)"). */
  highlightTerm?: number | null;
  /** Booklet styles for printing; answer keys are left out. */
  print?: boolean;
};

export function Blocks({ blocks, highlightTerm, print }: BlocksProps) {
  const s = (screen: string, booklet: string) => (print ? booklet : screen);
  return (
    <>
      {blocks.map((b, i) => {
        if (b.kind === "p") return <p key={i} className={s(styles.p, styles.bP)}>{b.text}</p>;
        if (b.kind === "check")
          return (
            <div key={i} className={s(styles.check, styles.bCheck)}>
              <span className={s(styles.box, styles.bBox)} />
              {b.text}
            </div>
          );
        if (b.kind === "answers") return print ? null : <AnswerKey key={i} text={b.text} />;
        const t = tableShape(b);
        const hi = highlightTerm ? new RegExp(`^${highlightTerm} \\(`) : null;
        return (
          <table key={i} className={s(styles.table, styles.bTable)}>
            {t.head && (
              <thead>
                <tr>
                  {t.head.map((h, j) => (
                    <th key={j}>{h}</th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {t.rows.map((r, j) => (
                <tr key={j} className={hi && hi.test(r[0] ?? "") ? styles.hiRow : undefined}>
                  {r.map((c, k) => (
                    <td key={k}>{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        );
      })}
    </>
  );
}

type SectionViewProps = {
  section: Omit<Section, "subs"> & { subs: { title: string; blocks: Block[]; meta?: string }[]; meta?: string };
  highlightTerm?: number | null;
};

/** A manual section on screen: title and meta, blocks, then its subsections. */
export function SectionView({ section, highlightTerm }: SectionViewProps) {
  return (
    <div className={styles.section}>
      {section.title && (
        <div className={styles.sectionHead}>
          <span className={styles.sectionTitle}>{section.title}</span>
          {section.meta && <span className={styles.sectionMeta}>{section.meta}</span>}
        </div>
      )}
      <Blocks blocks={section.blocks} highlightTerm={highlightTerm} />
      {section.subs.map((sub, i) => (
        <div key={i} className={styles.sub}>
          <div className={styles.subTitle}>{sub.title}</div>
          <Blocks blocks={sub.blocks} highlightTerm={highlightTerm} />
        </div>
      ))}
    </div>
  );
}
