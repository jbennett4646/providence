import type { Guide, GuideBlock } from "@/lib/content/guide";
import { KeyGate } from "./KeyGate";
import { inline, Rich } from "./Rich";
import styles from "./Guide.module.css";

const LETTERS = ["A", "B", "C", "D"];

function Block({ b }: { b: GuideBlock }) {
  switch (b.kind) {
    case "p":
      return <Rich text={b.text} className={styles.p} />;
    case "list":
      return (
        <ul className={styles.list}>
          {b.items.map((t, i) => (
            <li key={i}>{inline(t)}</li>
          ))}
        </ul>
      );
    case "steps":
      return (
        <ol className={styles.steps}>
          {b.items.map((t, i) => (
            <li key={i}>{inline(t)}</li>
          ))}
        </ol>
      );
    case "quote":
      return (
        <blockquote className={styles.quote}>
          <Rich text={b.text} />
        </blockquote>
      );
    case "facts":
      return (
        <dl className={styles.facts}>
          {b.rows.map(([k, v], i) => (
            <div key={i} className={styles.fact}>
              <dt>{k}</dt>
              <dd>{inline(v)}</dd>
            </div>
          ))}
        </dl>
      );
    case "table":
      return (
        <table className={styles.table}>
          <thead>
            <tr>
              {b.head.map((h, i) => (
                <th key={i}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {b.rows.map((r, i) => (
              <tr key={i}>
                {r.map((c, j) => (
                  <td key={j}>{inline(c)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    case "plan":
      return (
        <table className={styles.table}>
          <thead>
            <tr>
              {b.head.map((h, i) => (
                <th key={i}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {b.days.map((d) => (
              <tr key={d.day}>
                <td className={styles.dayCell}>{d.day}</td>
                <td>{inline(d.week34.text)}</td>
                <td>{inline(d.week35.text)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    case "group":
      return (
        <div className={styles.group}>
          <h3 className={styles.groupTitle}>{b.title}</h3>
          {b.intro && <Rich text={b.intro} className={styles.p} />}
          {b.passage && (
            <div className={styles.passage}>
              <div className={styles.passageTitle}>{b.passage.title}</div>
              <Rich text={b.passage.text} />
            </div>
          )}
          <ol className={styles.questions}>
            {b.questions.map((q) => (
              <li key={q.n} value={q.n} className={styles.question}>
                {q.q && <div className={styles.q}>{inline(q.q)}</div>}
                <div className={styles.options}>
                  {q.options.map((o, i) => (
                    <span key={i} className={styles.option}>
                      <span className={styles.bubble} aria-hidden="true" />
                      <span className={styles.letter}>{LETTERS[i]}.</span> {inline(o)}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ol>
        </div>
      );
    case "answersheet": {
      const half = Math.ceil(b.count / 2);
      const col = (from: number) => (
        <table className={styles.sheet}>
          <thead>
            <tr>
              <th>#</th>
              {LETTERS.map((l) => (
                <th key={l}>{l}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: Math.min(half, b.count - from + 1) }, (_, i) => (
              <tr key={i}>
                <td>{from + i}</td>
                {LETTERS.map((l) => (
                  <td key={l}>
                    <span className={styles.bubble} aria-hidden="true" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
      return (
        <div className={styles.sheets}>
          {col(1)}
          {col(half + 1)}
        </div>
      );
    }
    case "key":
      return (
        <KeyGate>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Area</th>
                <th>Answers</th>
              </tr>
            </thead>
            <tbody>
              {b.rows.map(([a, v], i) => (
                <tr key={i}>
                  <td>{a}</td>
                  <td>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </KeyGate>
      );
  }
}

export function GuideBody({ guide }: { guide: Guide }) {
  return (
    <>
      {guide.sections.map((s) => (
        <section key={s.id} id={s.id} className={styles.section}>
          <h2 className={styles.sectionTitle}>{s.title}</h2>
          {s.blocks.map((b, i) => (
            <Block key={i} b={b} />
          ))}
        </section>
      ))}
    </>
  );
}
