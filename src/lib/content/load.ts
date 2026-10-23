import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { course as courseSchema, courseIndex as courseIndexSchema } from "./schema";
import type { Course, CourseIndexEntry, Week } from "./schema";

/*
 * Course content is static and versioned with the code: `content/grade-N/`
 * holds an `index.json` and one file per course, in the handoff's schema.
 * Files are parsed and validated on first use, then cached for the process.
 */

const CONTENT_DIR = path.join(process.cwd(), "content");

const indexCache = new Map<number, CourseIndexEntry[]>();
const courseCache = new Map<string, Course>();

function gradeDir(grade: number): string {
  return path.join(CONTENT_DIR, `grade-${grade}`);
}

function readJson(file: string): unknown {
  return JSON.parse(readFileSync(file, "utf8"));
}

/** Grades with content loaded, ascending (0 is Kindergarten). */
export function availableGrades(): number[] {
  return readdirSync(CONTENT_DIR)
    .map((d) => /^grade-(\d+)$/.exec(d))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => Number(m[1]))
    .sort((a, b) => a - b);
}

/** The grade's courses in display order, or an empty list if the grade has no content yet. */
export function getCourseIndex(grade: number): CourseIndexEntry[] {
  const cached = indexCache.get(grade);
  if (cached) return cached;
  if (!availableGrades().includes(grade)) return [];
  const index = courseIndexSchema.parse(readJson(path.join(gradeDir(grade), "index.json")));
  indexCache.set(grade, index);
  return index;
}

/** One course's full content, or null if the grade has no such course. */
export function getCourse(grade: number, id: string): Course | null {
  const key = `${grade}:${id}`;
  const cached = courseCache.get(key);
  if (cached) return cached;
  const entry = getCourseIndex(grade).find((c) => c.id === id);
  if (!entry) return null;
  const parsed = courseSchema.safeParse(readJson(path.join(gradeDir(grade), entry.file)));
  if (!parsed.success) {
    throw new Error(`Invalid course content in grade-${grade}/${entry.file}: ${parsed.error.message}`);
  }
  courseCache.set(key, parsed.data);
  return parsed.data;
}

/** Every course in the grade, in display order. */
export function getCourses(grade: number): Course[] {
  return getCourseIndex(grade).map((e) => getCourse(grade, e.id)!);
}

/** A course's content for one week (1–36), or null if it has none. */
export function getWeek(course: Course, week: number): Week | null {
  for (const t of course.terms) {
    const w = t.weeks.find((x) => x.week === week);
    if (w) return w;
  }
  return null;
}
