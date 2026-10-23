import "server-only";
import type { Course } from "@/lib/content/schema";
import { getCourse, getCourseIndex } from "@/lib/content/load";
import { masteryInfo } from "@/lib/domain/course";
import { progress, scheduleIndex, type CourseRef, type Progress } from "@/lib/domain/progress";
import type { Child } from "./state";

export type Enrollment = Child["enrollments"][number];
export type LiveCourse = { e: Enrollment; course: Course };

/** Whether any of the course's term checks carries a score. */
export function isScored(course: Course): boolean {
  return course.terms.some((t) => masteryInfo(course, t.term).scored);
}

export function courseRef(course: Course): CourseRef {
  return { id: course.id, dash: course.dash, course: course.course, elective: !!course.elective, scored: isScored(course) };
}

/** The child's switched-on courses that have content, in the order the day is taught. */
export function liveCourses(child: Child): LiveCourse[] {
  return child.enrollments
    .filter((e) => e.active)
    .map((e) => ({ e, course: getCourse(e.grade, e.courseId) }))
    .filter((x): x is LiveCourse => x.course !== null)
    .sort((a, b) => scheduleIndex(a.e.courseId) - scheduleIndex(b.e.courseId));
}

const ELECTIVE_BLURBS: Record<string, string> = {
  workshop: "Keeping a house, a property and the things that break: tools, woodworking and repairs.",
  hearth: "Running a home: cooking, preserving food, keeping the house in order and having guests.",
};

/** The electives of the child's grade, and whether each is switched on. */
export function electiveOptions(child: Child) {
  return getCourseIndex(child.grade)
    .filter((c) => c.elective)
    .map((c) => {
      const course = getCourse(child.grade, c.id)!;
      return {
        id: c.id,
        name: course.course,
        blurb: ELECTIVE_BLURBS[c.id] ?? course.cadence,
        cadence: course.tracks.map((t) => t.label).join(" · "),
        on: child.enrollments.some((e) => e.courseId === c.id && e.grade === child.grade && e.active),
      };
    });
}

export function childProgress(child: Child): Progress {
  const refs = new Map<string, CourseRef>();
  for (const e of child.enrollments) {
    const c = getCourse(e.grade, e.courseId);
    if (c) refs.set(c.id, courseRef(c));
  }
  return progress(
    [...refs.values()],
    child.enrollments.map((e) => ({ courseId: e.courseId, grade: e.grade, pos: e.pos, active: e.active, reviewTerm: e.reviewTerm })),
    child.gates.map((g) => ({ courseId: g.courseId, grade: g.grade, term: g.term, score: g.score, of: g.of, pass: g.pass })),
  );
}
