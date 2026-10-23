import "server-only";
import path from "node:path";
import { Document, Font, Page, Path, renderToBuffer, StyleSheet, Svg, Text, View } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import type { DeclarationModel, ReportCourse, ReportModel } from "./model";

/*
 * The state forms as PDFs, in the academy's type: EB Garamond for headings
 * and Libre Franklin for small print, embedded from assets/fonts (OFL).
 */

const FONTS = path.join(process.cwd(), "assets", "fonts");
Font.register({
  family: "Garamond",
  fonts: [
    { src: path.join(FONTS, "EBGaramond-Regular.ttf") },
    { src: path.join(FONTS, "EBGaramond-Medium.ttf"), fontWeight: 500 },
    { src: path.join(FONTS, "EBGaramond-Italic.ttf"), fontStyle: "italic" },
  ],
});
Font.register({
  family: "Franklin",
  fonts: [
    { src: path.join(FONTS, "LibreFranklin-Regular.ttf") },
    { src: path.join(FONTS, "LibreFranklin-Medium.ttf"), fontWeight: 500 },
    { src: path.join(FONTS, "LibreFranklin-SemiBold.ttf"), fontWeight: 600 },
  ],
});
// Keep words whole; the forms never need hyphenation.
Font.registerHyphenationCallback((word) => [word]);

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
/** "1 May 2017" */
const fmtDate = (d: string) => `${Number(d.slice(8, 10))} ${MONTHS[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`;

const INK = "#1F1B15";
const ACCENT = "#A87C3D";
const RULE = "#C9BB9E";
const GREY = "#5E5648";
const LIGHT = "#8A8071";

const s = StyleSheet.create({
  page: { paddingTop: 40, paddingBottom: 56, paddingHorizontal: 58, fontFamily: "Garamond", fontSize: 12, color: INK, lineHeight: 1.45 },
  head: { alignItems: "center", borderBottomWidth: 1.5, borderBottomColor: INK, paddingBottom: 12, marginBottom: 16 },
  brand: { fontSize: 18, letterSpacing: 2.5, marginTop: 8 },
  kind: { fontFamily: "Franklin", fontSize: 8, letterSpacing: 2, textTransform: "uppercase", color: GREY, marginTop: 5 },
  title: { fontSize: 22, fontWeight: 500, lineHeight: 1.2, marginBottom: 6 },
  sub: { fontStyle: "italic", fontSize: 12.5, color: GREY, marginBottom: 14 },
  section: { marginBottom: 12 },
  label: { fontFamily: "Franklin", fontSize: 7.5, letterSpacing: 1.6, textTransform: "uppercase", color: LIGHT, marginBottom: 4 },
  sectionTitle: { fontSize: 15, fontWeight: 500, borderBottomWidth: 0.75, borderBottomColor: INK, paddingBottom: 3, marginBottom: 8 },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: RULE, paddingVertical: 5 },
  cell: { flex: 1 },
  small: { fontFamily: "Franklin", fontSize: 8.5, color: GREY, lineHeight: 1.5 },
  grid: { flexDirection: "row", gap: 18, marginBottom: 6 },
  field: { flex: 1 },
  value: { fontSize: 13 },
  blank: { borderBottomWidth: 0.75, borderBottomColor: GREY, height: 22 },
  sign: { flexDirection: "row", gap: 30, marginTop: 26 },
  footer: { position: "absolute", bottom: 30, left: 58, right: 58, flexDirection: "row", justifyContent: "space-between", fontFamily: "Franklin", fontSize: 7.5, color: LIGHT },
  note: { fontSize: 12, lineHeight: 1.5, marginTop: 4 },
  noteBox: { borderWidth: 0.5, borderColor: RULE, padding: 8, minHeight: 54, marginTop: 4 },
});

function Crest() {
  return (
    <Svg width={22} height={25} viewBox="0 0 30 34">
      <Path d="M1 1h28v19.5C29 27 22.5 31 15 33 7.5 31 1 27 1 20.5V1Z" stroke={ACCENT} strokeWidth={1.4} fill="none" />
      <Path d="M15 6v20M6 16h18" stroke={ACCENT} strokeWidth={1.1} />
    </Svg>
  );
}

function Masthead({ kind }: { kind: string }) {
  return (
    <View style={s.head}>
      <Crest />
      <Text style={s.brand}>PROVIDENCE HOME ACADEMY</Text>
      <Text style={s.kind}>{kind}</Text>
    </View>
  );
}

function Footer({ left }: { left: string }) {
  return (
    <View style={s.footer} fixed>
      <Text>{left}</Text>
      <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
    </View>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      {children}
    </View>
  );
}

function Signature({ who }: { who: string }) {
  return (
    <View style={s.sign} wrap={false}>
      <View style={{ flex: 1.5 }}>
        <View style={s.blank} />
        <Text style={[s.label, { marginTop: 4 }]}>{who}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={s.blank} />
        <Text style={[s.label, { marginTop: 4 }]}>Date</Text>
      </View>
    </View>
  );
}

export function DeclarationDoc({ m }: { m: DeclarationModel }) {
  return (
    <Document title={`Declaration of Intent ${m.schoolYear}`} author="Providence Home Academy" creator="Providence Home Academy">
      <Page size="LETTER" style={s.page}>
        <Masthead kind="Prepared for filing · Georgia home study" />
        <Text style={s.title}>Declaration of Intent to Utilize a Home Study Program</Text>
        <Text style={s.sub}>School year {m.schoolYear} · O.C.G.A. § 20-2-690</Text>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Parent or guardian</Text>
          <View style={s.grid}>
            <Field label="Name">
              <Text style={s.value}>{m.parentName || " "}</Text>
            </Field>
            <Field label="Email">
              <Text style={s.value}>{m.email || " "}</Text>
            </Field>
            <Field label="Telephone">
              <Text style={s.value}>{m.phone || " "}</Text>
            </Field>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Where the home study program is located</Text>
          <View style={s.grid}>
            <Field label="Address">
              {m.address.length ? m.address.map((l, i) => <Text key={i} style={s.value}>{l}</Text>) : <View style={s.blank} />}
            </Field>
            <Field label="County">
              <Text style={s.value}>{m.county || " "}</Text>
            </Field>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>The school year</Text>
          <Text style={s.value}>
            The twelve-month period from {m.period.from} to {m.period.to}.
          </Text>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Students enrolled in the home study program</Text>
          <View style={[s.row, { borderBottomColor: INK }]}>
            <Text style={[s.label, { flex: 2, marginBottom: 0 }]}>Name</Text>
            <Text style={[s.label, s.cell, { marginBottom: 0 }]}>Age</Text>
            <Text style={[s.label, s.cell, { marginBottom: 0 }]}>Date of birth</Text>
            <Text style={[s.label, s.cell, { marginBottom: 0 }]}>Grade</Text>
          </View>
          {m.students.map((st, i) => (
            <View key={i} style={s.row}>
              <Text style={{ flex: 2 }}>{st.name}</Text>
              <Text style={s.cell}>{st.age ?? "—"}</Text>
              <Text style={s.cell}>{st.birthDate ? fmtDate(st.birthDate) : "—"}</Text>
              <Text style={s.cell}>{st.grade}</Text>
            </View>
          ))}
        </View>

        <Text style={s.small}>
          The parent or guardian named above declares the intent to teach the students listed in a home study program for the school year shown, providing the
          equivalent of 180 school days of at least four and one-half hours each, in reading, language arts, mathematics, social studies and science.
        </Text>
        <Signature who="Signature of parent or guardian" />
        <Text style={[s.small, { marginTop: 18 }]}>
          File the declaration with the Georgia Department of Education within 30 days of starting home study, then by September 1 each year: through its online
          form (every answer it asks for is on this page) or by mail. Keep a copy with your records.
        </Text>
        <Footer left={`Prepared ${m.prepared} from the household record`} />
      </Page>
    </Document>
  );
}

function CourseRows({ courses }: { courses: ReportCourse[] }) {
  return (
    <>
      {courses.map((c, i) => (
        <View key={i} style={s.row} wrap={false}>
          <View style={{ flex: 1.3 }}>
            <Text>{c.name}</Text>
            <Text style={s.small}>{c.standing}</Text>
          </View>
          <View style={{ flex: 1.7 }}>
            <Text style={{ fontSize: 11 }}>
              {c.position} · {c.progress}
            </Text>
            {c.checks.map((k, j) => (
              <Text key={j} style={s.small}>
                {k}
              </Text>
            ))}
          </View>
        </View>
      ))}
    </>
  );
}

export function ReportDoc({ m }: { m: ReportModel }) {
  return (
    <Document title={`Annual progress report · ${m.student} · ${m.schoolYear}`} author={m.parentName || m.household} creator="Providence Home Academy">
      <Page size="LETTER" style={s.page}>
        <Masthead kind={m.georgia ? "Annual progress report · Georgia home study" : "Annual progress report"} />
        <Text style={s.title}>{m.student}</Text>
        <Text style={s.sub}>
          School year {m.schoolYear} · {m.period.from} to {m.period.to}
        </Text>

        <View style={s.grid}>
          <Field label="Grade in progress">
            <Text style={s.value}>{m.gradeInProgress}</Text>
          </Field>
          <Field label="Completed">
            <Text style={s.value}>{m.completed}</Text>
          </Field>
          <Field label="Age">
            <Text style={s.value}>{m.age ?? "—"}</Text>
          </Field>
          <Field label="Household">
            <Text style={s.value}>{m.household}</Text>
          </Field>
        </View>

        <View style={s.section} wrap={false}>
          <Text style={s.sectionTitle}>Attendance</Text>
          <Text>
            {m.attendance.days} of {m.attendance.required} school days logged
            {m.attendance.priorDays ? ` (including ${m.attendance.priorDays} taught before joining)` : ""}.{" "}
            {m.attendance.loggedHere
              ? `Average day ${m.attendance.averageHours} hours across the ${m.attendance.loggedHere} days recorded here; ${m.attendance.shortDays ? `${m.attendance.shortDays} under four and one-half hours` : "none under four and one-half hours"}.`
              : "No school days recorded here yet."}
          </Text>
        </View>

        <Text style={[s.label, { marginBottom: 8 }]}>{m.georgia ? "The five subjects Georgia requires" : "Core subjects"}</Text>
        {m.subjects.map((sub) => (
          <View key={sub.name} style={s.section}>
            <Text style={s.sectionTitle}>{sub.name}</Text>
            {sub.courses.length ? <CourseRows courses={sub.courses} /> : <Text style={s.small}>No courses on record for this subject yet.</Text>}
            <Text style={[s.label, { marginTop: 8 }]}>Parent’s assessment</Text>
            {sub.note ? <Text style={s.note}>{sub.note}</Text> : <View style={s.noteBox} />}
          </View>
        ))}

        {m.beyond.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Beyond the requirement</Text>
            <CourseRows courses={m.beyond} />
          </View>
        )}

        <Text style={s.small}>
          Progress is shown as mastery and completion, never letter grades. A grade level is certified only when every required course for it is finished. Positions
          are in weeks of a 36-week year, six terms of six weeks; each term ends with a check against the manual’s mastery line.
        </Text>
        <Signature who={`Instructing parent${m.parentName ? ` · ${m.parentName}` : ""}`} />
        {m.georgia && (
          <Text style={[s.small, { marginTop: 22 }]}>
            Georgia asks the parent to write an annual progress report in each required subject and to keep it for three years. It is not filed with the state.
          </Text>
        )}
        <Footer left={`${m.student} · ${m.schoolYear} · prepared ${m.prepared}`} />
      </Page>
    </Document>
  );
}

export function renderPdf(doc: React.ReactElement): Promise<Buffer> {
  return renderToBuffer(doc as Parameters<typeof renderToBuffer>[0]);
}
