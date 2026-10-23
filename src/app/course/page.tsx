import type { Metadata } from "next";
import { Screen } from "@/components/Screen";
import { ScreenPlaceholder } from "@/components/ScreenPlaceholder";

export const metadata: Metadata = { title: "Course manuals" };

export default function CourseManualsPage() {
  return (
    <Screen label="Course manual" tone="parchment">
      <ScreenPlaceholder kicker="Grade 3" title="Course manuals">
        Year plans, term manuals, reference pages and answer keys for every course.
      </ScreenPlaceholder>
    </Screen>
  );
}
