import "server-only";
import { getGuide, readinessPlan, type Guide } from "@/lib/content/guide";
import type { DateKey } from "@/lib/domain/dates";
import {
  nextSession,
  READINESS_GRADE,
  READINESS_GUIDE,
  READINESS_MINUTES,
  READINESS_SESSIONS,
  READINESS_TEST,
  readinessPhase,
  sessionSlot,
  type ReadinessPhase,
} from "@/lib/domain/readiness";
import type { Child, ChildRecords, HouseholdContext } from "./state";

/*
 * What the Teaching screen shows of the Grade 3 test readiness guide: a
 * reminder to order the test from week 30, one short practice session a day
 * in weeks 34–35, and the test in week 36. It follows the school calendar,
 * not course positions, and it is not a course: it stays out of the floor
 * rule and the term checks.
 */

export const GUIDE_HREF = `/guides/grade-${READINESS_GRADE}/${READINESS_GUIDE}`;
export const GUIDE_PDF_HREF = `/api/guides/grade-${READINESS_GRADE}/${READINESS_GUIDE}`;

export type PracticeSession = {
  session: number;
  week: 34 | 35;
  day: number;
  title: string;
  /** The plan's line for the day, with **bold** marks. */
  text: string;
  /** Where in the guide the day's material is. */
  href: string;
};

export type ReadinessView = {
  phase: ReadinessPhase;
  /** Practice sessions done, of ten. */
  done: number;
  /** The next session to do, or null once all ten are done. */
  next: PracticeSession | null;
  /** Sessions recorded today (each can be undone today). */
  doneToday: PracticeSession[];
  /** Paper check-in: whether each practice week's five sessions are recorded. */
  weekDone: { 34: boolean; 35: boolean };
  testDate: DateKey | null;
  /** The guide's notes for the parent, for the week of the test. */
  notes: string[];
  /** What to tell the child, from the guide. */
  tellChild: string;
  materials: string;
};

/** Is the guide part of this child's year at all, and today's practice minutes on paper. */
export function readinessToday(child: Pick<Child, "grade">, ctx: HouseholdContext): { phase: ReadinessPhase | null; practiceMins: number } {
  if (child.grade !== READINESS_GRADE || !getGuide(READINESS_GRADE, READINESS_GUIDE)) return { phase: null, practiceMins: 0 };
  const phase = readinessPhase(ctx.calendar, ctx.today);
  return { phase, practiceMins: phase.kind === "practice" ? READINESS_MINUTES : 0 };
}

function anchorFor(title: string): string {
  if (/answer sheet/i.test(title)) return "practice-answer-sheet";
  if (/gap review/i.test(title)) return "gap-review";
  if (/strateg/i.test(title)) return "test-strategies";
  return "sample-questions";
}

function sessionOf(guide: Guide, session: number): PracticeSession {
  const { week, day } = sessionSlot(session);
  const row = readinessPlan(guide).find((d) => d.day === day);
  const cell = week === 34 ? row?.week34 : row?.week35;
  const title = cell?.title ?? `Day ${day}`;
  return { session, week, day, title, text: cell?.text ?? "", href: `${GUIDE_HREF}#${anchorFor(title)}` };
}

function firstOf(guide: Guide, sectionId: string, kind: "list" | "quote" | "p"): string[] {
  const b = guide.sections.find((s) => s.id === sectionId)?.blocks.find((x) => x.kind === kind);
  if (!b) return [];
  return b.kind === "list" ? b.items : b.kind === "quote" || b.kind === "p" ? [b.text] : [];
}

/** The readiness view for a Grade 3 child, or null when it isn't time (or isn't their grade). */
export function readinessView(child: Child, ctx: HouseholdContext, rec: ChildRecords): ReadinessView | null {
  const { phase } = readinessToday(child, ctx);
  if (!phase || phase.kind === "before" || phase.kind === "after") return null;
  const guide = getGuide(READINESS_GRADE, READINESS_GUIDE)!;
  const mine = rec.guideSessions.filter((s) => s.grade === READINESS_GRADE && s.guideId === READINESS_GUIDE);
  const done = new Set(mine.map((s) => s.session));
  const n = nextSession(done);
  const inWeek = (w: 34 | 35) => Array.from({ length: READINESS_SESSIONS }, (_, i) => i + 1).filter((s) => sessionSlot(s).week === w);
  return {
    phase,
    done: done.size,
    next: n ? sessionOf(guide, n) : null,
    doneToday: mine
      .filter((s) => s.doneOn === ctx.today)
      .sort((a, b) => a.session - b.session)
      .map((s) => sessionOf(guide, s.session)),
    weekDone: { 34: inWeek(34).every((s) => done.has(s)), 35: inWeek(35).every((s) => done.has(s)) },
    testDate: rec.tests.get(READINESS_TEST) ?? null,
    notes: firstOf(guide, "notes-for-the-parent", "list"),
    tellChild: firstOf(guide, "low-stakes-what-to-tell-the-child", "quote")[0] ?? "",
    materials: firstOf(guide, "materials", "p")[0] ?? "",
  };
}
