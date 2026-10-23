import { sql } from "drizzle-orm";
import { availableGrades, getCourseIndex } from "@/lib/content/load";
import type { Db } from "./client";
import { courses } from "./schema";

/**
 * Import the course catalog from content/grade-N/index.json into `courses`.
 * Safe to re-run: existing rows are updated in place.
 */
export async function importCatalog(db: Db): Promise<number> {
  const rows = availableGrades().flatMap((grade) =>
    getCourseIndex(grade).map((c, i) => ({
      grade,
      id: c.id,
      course: c.course,
      dash: c.dash,
      number: c.number,
      file: c.file,
      elective: !!c.elective,
      sortOrder: i,
    })),
  );
  if (rows.length === 0) return 0;
  await db
    .insert(courses)
    .values(rows)
    .onConflictDoUpdate({
      target: [courses.grade, courses.id],
      set: {
        course: sql`excluded.course`,
        dash: sql`excluded.dash`,
        number: sql`excluded.number`,
        file: sql`excluded.file`,
        elective: sql`excluded.elective`,
        sortOrder: sql`excluded.sort_order`,
      },
    });
  return rows.length;
}
