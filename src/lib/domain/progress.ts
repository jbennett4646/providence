import { FINISHED_POS, WEEKS_PER_TERM, WEEKS_PER_YEAR } from "@/lib/content/year";
import { posLabel, weekPct } from "./course";
import { gradeLabel } from "./grades";

export { gradeLabel };

/*
 * Grade certification. Positions are compared in weeks, never raw item
 * counts, so daily courses (5 items a week) and queue courses (4) line up.
 * A child's grade is set by the slowest required course, never an average.
 * Electives are excluded.
 */

export type CourseRef = {
  id: string;
  /** Display name on the dashboard, e.g. "Literature & Read-Alouds". */
  dash: string;
  course: string;
  elective: boolean;
  /** Whether the course's term checks carry a score. */
  scored: boolean;
};

export type Placement = {
  courseId: string;
  grade: number;
  /** 1–36, or 37 when the grade is finished in this course. */
  pos: number;
  active: boolean;
  reviewTerm: number | null;
};

export type GateRecord = { courseId: string; grade: number; term: number; score: number | null; of: number | null; pass: boolean };

/** Order the day is taught in, and the order courses list on the dashboard. */
export const SCHEDULE_ORDER = [
  "bible", "memory", "arithmetic", "literature", "grammar", "spelling", "penmanship",
  "latin", "history", "science", "finearts", "pe", "workshop", "hearth", "virtue",
];

export function scheduleIndex(id: string): number {
  const i = SCHEDULE_ORDER.indexOf(id);
  return i === -1 ? SCHEDULE_ORDER.length : i;
}


/** Where a course stands as (grade, week): a finished grade counts as week 1 of the next. */
export function effective(p: Pick<Placement, "grade" | "pos">): { grade: number; week: number } {
  return p.pos >= FINISHED_POS ? { grade: p.grade + 1, week: 1 } : { grade: p.grade, week: p.pos };
}

/** The latest placement per course (the highest grade enrolled). */
export function latestPlacements(placements: Placement[]): Placement[] {
  const byCourse = new Map<string, Placement>();
  for (const p of placements) {
    const cur = byCourse.get(p.courseId);
    if (!cur || p.grade > cur.grade) byCourse.set(p.courseId, p);
  }
  return [...byCourse.values()];
}

export type SubjectRow = {
  courseId: string;
  name: string;
  grade: number;
  week: number;
  gradeLabel: string;
  lessonLabel: string;
  pct: number;
  standing: string;
  elective: boolean;
  isFloor: boolean;
  ahead: boolean;
};

export type Floor = {
  /** The grade in progress: the lowest grade among required courses. */
  grade: number;
  label: string;
  /** "Grade 2", "Kindergarten", or "nothing certified yet". */
  completedLabel: string;
  course: SubjectRow;
  /** Required courses still at the floor grade. */
  openCount: number;
  requiredCount: number;
  /** Weeks left in the floor course. */
  weeksRemaining: number;
};

export type Progress = { rows: SubjectRow[]; floor: Floor | null };

/** The standing shown beside a course: mastery and completion, never letter grades. */
export function standing(course: CourseRef, grade: number, week: number, gates: GateRecord[]): string {
  const termsDone = Math.floor((week - 1) / WEEKS_PER_TERM);
  if (!course.scored) return termsDone ? `${termsDone} of 6 terms` : "—";
  if (!termsDone) return "—";
  const last = gates.find((g) => g.courseId === course.id && g.grade === grade && g.term === termsDone);
  if (!last) return "Mastered";
  return last.pass ? `Mastered · ${last.score}/${last.of}` : "Review week";
}

export function progress(courses: CourseRef[], placements: Placement[], gates: GateRecord[]): Progress {
  const byId = new Map(courses.map((c) => [c.id, c]));
  const rows: SubjectRow[] = latestPlacements(placements)
    .filter((p) => byId.has(p.courseId) && (!byId.get(p.courseId)!.elective || p.active))
    .sort((a, b) => scheduleIndex(a.courseId) - scheduleIndex(b.courseId))
    .map((p) => {
      const c = byId.get(p.courseId)!;
      const { grade, week } = effective(p);
      return {
        courseId: c.id,
        name: c.dash,
        grade,
        week,
        gradeLabel: c.elective ? `Elective · ${gradeLabel(grade)}` : gradeLabel(grade),
        lessonLabel: posLabel(week),
        pct: weekPct(week),
        standing: standing(c, grade, week, gates),
        elective: c.elective,
        isFloor: false,
        ahead: false,
      };
    });

  const required = rows.filter((r) => !r.elective);
  if (!required.length) return { rows, floor: null };

  const floorGrade = Math.min(...required.map((r) => r.grade));
  const atFloor = required.filter((r) => r.grade === floorGrade);
  const floorRow = [...atFloor].sort((a, b) => a.week - b.week || scheduleIndex(a.courseId) - scheduleIndex(b.courseId))[0];
  for (const r of rows) {
    r.isFloor = r === floorRow;
    r.ahead = !r.elective && r.grade > floorGrade;
  }
  return {
    rows,
    floor: {
      grade: floorGrade,
      label: gradeLabel(floorGrade),
      completedLabel: floorGrade === 0 ? "nothing certified yet" : gradeLabel(floorGrade - 1),
      course: floorRow,
      openCount: atFloor.length,
      requiredCount: required.length,
      weeksRemaining: WEEKS_PER_YEAR - floorRow.week + 1,
    },
  };
}

/** The progymnasmata (composition) stage that goes with a grade. */
export function progymStage(grade: number): string {
  return ({ 3: "1", 4: "2", 5: "3–4" } as Record<number, string>)[grade] ?? "—";
}

/** Overall standing for the record: whether every scored term check met its line. */
export function overallStanding(gates: GateRecord[]): { label: string; note: string } {
  const scored = gates.filter((g) => g.score != null);
  if (!scored.length) return { label: "—", note: "no scored term checks recorded yet" };
  const below = scored.filter((g) => !g.pass).length;
  if (!below) return { label: "Mastered", note: "every scored term check so far met its mastery line" };
  return {
    label: "Reviewing",
    note: `${below} term check${below === 1 ? "" : "s"} below the mastery line, each followed by a review week`,
  };
}
