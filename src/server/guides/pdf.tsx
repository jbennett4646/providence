import "server-only";
import { Document, Page, Path, StyleSheet, Svg, Text, View } from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";
import type { ReactNode } from "react";
import type { Guide, GuideBlock } from "@/lib/content/guide";
import { FRACTIONS, registerFonts } from "../pdf/fonts";

/*
 * A grade guide as a printable booklet: US Letter, the academy's type, a
 * cover, then the guide's sections. The answer sheet and the answer key
 * each start a page, so they can be pulled out.
 */

registerFonts();

const INK = "#1F1B15";
const ACCENT = "#A87C3D";
const RULE = "#A99A7C";
const LIGHT_RULE = "#DDD0B5";
const GREY = "#5E5648";
const LETTERS = ["A", "B", "C", "D"];

const s = StyleSheet.create({
  page: { paddingTop: 46, paddingBottom: 50, paddingHorizontal: 60, fontFamily: "Garamond", fontSize: 11.5, color: INK },
  // Line height sits on the content, not the page: fixed render Texts inherit from the page and react-pdf
  // re-multiplies an inherited line height on every page until it overflows.
  body: { fontSize: 11.5, lineHeight: 1.45 },
  cover: { flexGrow: 1, alignItems: "center", justifyContent: "center", textAlign: "center" },
  coverBrand: { fontSize: 13, letterSpacing: 3 },
  coverRule: { width: 48, height: 1, backgroundColor: INK, marginVertical: 22 },
  coverTitle: { fontSize: 36, lineHeight: 1.15 },
  coverSub: { fontSize: 15, fontStyle: "italic", marginTop: 12, color: GREY, maxWidth: 380 },
  coverFor: { fontFamily: "Franklin", fontSize: 9, letterSpacing: 2, textTransform: "uppercase", marginTop: 34 },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", borderBottomWidth: 1.2, borderBottomColor: INK, paddingBottom: 4, marginBottom: 10, marginTop: 6 },
  headTitle: { fontSize: 18 },
  headMeta: { fontFamily: "Franklin", fontSize: 7.5, letterSpacing: 1.4, textTransform: "uppercase", color: GREY },
  p: { marginBottom: 7 },
  bold: { fontWeight: 500 },
  italic: { fontStyle: "italic" },
  li: { flexDirection: "row", marginBottom: 4 },
  bullet: { width: 14, color: ACCENT },
  liText: { flex: 1 },
  quote: { borderLeftWidth: 2, borderLeftColor: ACCENT, paddingLeft: 12, paddingVertical: 4, marginBottom: 9, fontSize: 13, fontStyle: "italic" },
  table: { borderTopWidth: 0.8, borderTopColor: INK, marginBottom: 10 },
  tr: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: LIGHT_RULE },
  th: { fontFamily: "Franklin", fontSize: 7.5, letterSpacing: 1.2, textTransform: "uppercase", color: GREY, paddingVertical: 4, paddingRight: 8 },
  td: { paddingVertical: 3.5, paddingRight: 8, fontSize: 10.5 },
  groupTitle: { fontSize: 13.5, fontWeight: 500, marginTop: 8, marginBottom: 4 },
  passage: { borderWidth: 0.6, borderColor: RULE, padding: 9, marginBottom: 8 },
  passageTitle: { fontWeight: 500, marginBottom: 3 },
  q: { marginBottom: 7 },
  qLine: { flexDirection: "row" },
  qNum: { width: 22, color: ACCENT },
  options: { flexDirection: "row", flexWrap: "wrap", marginLeft: 22, marginTop: 2 },
  option: { width: "50%", flexDirection: "row", alignItems: "center", marginBottom: 2, paddingRight: 8 },
  bubble: { width: 9, height: 9, borderRadius: 4.5, borderWidth: 0.8, borderColor: RULE, marginRight: 5 },
  sheets: { flexDirection: "row", gap: 30 },
  sheet: { flex: 1 },
  sheetRow: { flexDirection: "row", alignItems: "center", paddingVertical: 3.2, borderBottomWidth: 0.5, borderBottomColor: LIGHT_RULE },
  sheetNum: { width: 26, textAlign: "right", marginRight: 12, fontSize: 10.5, color: GREY },
  sheetCell: { width: 34, alignItems: "center" },
  sheetBubble: { width: 12, height: 12, borderRadius: 6, borderWidth: 0.9, borderColor: GREY },
  footLeft: { position: "absolute", bottom: 26, left: 60, fontFamily: "Franklin", fontSize: 7.5, color: GREY },
  footRight: { position: "absolute", bottom: 26, left: 60, right: 60, textAlign: "right", fontFamily: "Franklin", fontSize: 7.5, color: GREY },
});

/** **bold**, *italic* and fractions, as nested Text runs. */
function Rich({ text }: { text: string }): ReactNode {
  const out: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\*(.+?)\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  const plain = (t: string) =>
    t.split(FRACTIONS).map((part, j) =>
      FRACTIONS.test(part) ? (
        <Text key={`f${i}-${j}`} style={{ fontFamily: "Fractions", fontSize: 10 }}>
          {part}
        </Text>
      ) : (
        part
      ),
    );
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(...plain(text.slice(last, m.index)));
    out.push(
      <Text key={i++} style={m[1] != null ? s.bold : s.italic}>
        {plain(m[1] ?? m[2])}
      </Text>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(...plain(text.slice(last)));
  return out;
}

function Paras({ text, style }: { text: string; style?: Style }) {
  return (
    <>
      {text.split(/\n{2,}/).map((p, i) => (
        <Text key={i} style={style ? [s.p, style] : s.p}>
          <Rich text={p} />
        </Text>
      ))}
    </>
  );
}

function Table({ head, rows, widths }: { head: string[]; rows: string[][]; widths: number[] }) {
  const row = (r: string[], i: number) => (
    <View key={i} style={s.tr} wrap={false}>
      {r.map((c, j) => (
        <Text key={j} style={[s.td, { flex: widths[j] }]}>
          <Rich text={c} />
        </Text>
      ))}
    </View>
  );
  // The header row travels with the first row, so it is never left alone at the foot of a page.
  return (
    <View style={s.table}>
      <View wrap={false}>
        <View style={s.tr}>
          {head.map((h, i) => (
            <Text key={i} style={[s.th, { flex: widths[i] }]}>
              {h}
            </Text>
          ))}
        </View>
        {rows.slice(0, 1).map(row)}
      </View>
      {rows.slice(1).map((r, i) => row(r, i + 1))}
    </View>
  );
}

function Block({ b }: { b: GuideBlock }) {
  switch (b.kind) {
    case "p":
      return <Paras text={b.text} />;
    case "list":
    case "steps":
      return (
        <View style={{ marginBottom: 6 }}>
          {b.items.map((t, i) => (
            <View key={i} style={s.li} wrap={false}>
              <Text style={s.bullet}>{b.kind === "steps" ? `${i + 1}.` : "•"}</Text>
              <Text style={s.liText}>
                <Rich text={t} />
              </Text>
            </View>
          ))}
        </View>
      );
    case "quote":
      return (
        <View style={s.quote} wrap={false}>
          <Paras text={b.text} style={{ marginBottom: 0 }} />
        </View>
      );
    case "facts":
      return <Table head={["", ""]} rows={b.rows} widths={[1, 2.3]} />;
    case "table":
      return <Table head={b.head} rows={b.rows} widths={b.head.length === 3 ? [0.9, 1.4, 1.7] : b.head.map(() => 1)} />;
    case "plan":
      return <Table head={b.head} rows={b.days.map((d) => [String(d.day), d.week34.text, d.week35.text])} widths={[0.25, 1, 1]} />;
    case "group":
      return (
        <View style={{ marginBottom: 6 }}>
          <Text style={s.groupTitle}>
            {b.title}
          </Text>
          {b.intro && <Paras text={b.intro} />}
          {b.passage && (
            <View style={s.passage} wrap={false}>
              <Text style={s.passageTitle}>{b.passage.title}</Text>
              <Paras text={b.passage.text} style={{ marginBottom: 0 }} />
            </View>
          )}
          {b.questions.map((q) => (
            <View key={q.n} style={s.q} wrap={false}>
              <View style={s.qLine}>
                <Text style={s.qNum}>{q.n}.</Text>
                <Text style={{ flex: 1 }}>
                  <Rich text={q.q} />
                </Text>
              </View>
              <View style={s.options}>
                {q.options.map((o, i) => (
                  <View key={i} style={s.option}>
                    <View style={s.bubble} />
                    <Text>
                      {LETTERS[i]}. <Rich text={o} />
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      );
    case "answersheet": {
      const half = Math.ceil(b.count / 2);
      const col = (from: number, n: number) => (
        <View style={s.sheet}>
          <View style={s.sheetRow}>
            <Text style={[s.sheetNum, s.th]}>#</Text>
            {LETTERS.map((l) => (
              <View key={l} style={s.sheetCell}>
                <Text style={s.th}>{l}</Text>
              </View>
            ))}
          </View>
          {Array.from({ length: n }, (_, i) => (
            <View key={i} style={s.sheetRow}>
              <Text style={s.sheetNum}>{from + i}</Text>
              {LETTERS.map((l) => (
                <View key={l} style={s.sheetCell}>
                  <View style={s.sheetBubble} />
                </View>
              ))}
            </View>
          ))}
        </View>
      );
      return (
        <View style={s.sheets}>
          {col(1, half)}
          {col(half + 1, b.count - half)}
        </View>
      );
    }
    case "key":
      return <Table head={["Area", "Answers"]} rows={b.rows} widths={[1, 2.3]} />;
  }
}

function Crest() {
  return (
    <Svg width={26} height={30} viewBox="0 0 30 34" style={{ marginBottom: 14 }}>
      <Path d="M1 1h28v19.5C29 27 22.5 31 15 33 7.5 31 1 27 1 20.5V1Z" stroke={ACCENT} strokeWidth={1.4} fill="none" />
      <Path d="M15 6v20M6 16h18" stroke={ACCENT} strokeWidth={1.1} />
    </Svg>
  );
}

/** Sections that start a new page in print. */
const PAGE_BREAK = new Set(["sample-questions", "practice-answer-sheet", "answer-key"]);
const PARENT_ONLY = new Set(["answer-key"]);

export function GuideDoc({ guide, forLine }: { guide: Guide; forLine: string }) {
  return (
    <Document title={guide.title} author="Providence Home Academy" creator="Providence Home Academy">
      <Page size="LETTER" style={s.page}>
        <View style={s.cover}>
          <Crest />
          <Text style={s.coverBrand}>PROVIDENCE HOME ACADEMY</Text>
          <View style={s.coverRule} />
          <Text style={s.coverTitle}>{guide.title}</Text>
          <Text style={s.coverSub}>{guide.subtitle.replace(/^Providence Home Academy · /, "")}</Text>
          <Text style={s.coverFor}>{forLine}</Text>
        </View>
      </Page>
      <Page size="LETTER" style={s.page}>
        {guide.sections.map((sec) => (
          <View key={sec.id} style={s.body} break={PAGE_BREAK.has(sec.id)}>
            <View style={s.head}>
              <Text style={s.headTitle}>{sec.title}</Text>
              {PARENT_ONLY.has(sec.id) && <Text style={s.headMeta}>Parent&apos;s copy</Text>}
            </View>
            {sec.blocks.map((b, i) => (
              <Block key={i} b={b} />
            ))}
          </View>
        ))}
        <Text style={s.footLeft} fixed>Providence Home Academy · {guide.title}</Text>
        <Text style={s.footRight} fixed render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
      </Page>
    </Document>
  );
}
