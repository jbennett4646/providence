import { redirect } from "next/navigation";
import { getCourseIndex } from "@/lib/content/load";
import { requireHousehold, selectedChild } from "@/server/session";
import { childProgress } from "@/server/views";

/** Course manuals open on the selected child's floor course. */
export default async function CourseIndex() {
  const h = await requireHousehold();
  const child = await selectedChild(h.children);
  const floor = child ? childProgress(child).floor : null;
  const id = floor?.course.courseId ?? getCourseIndex(child?.grade ?? 3)[0]?.id ?? getCourseIndex(3)[0].id;
  redirect(`/course/${id}`);
}
