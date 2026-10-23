import type { Metadata } from "next";
import { ScreenPlaceholder } from "@/components/ScreenPlaceholder";

export const metadata: Metadata = { title: "Students" };

export default function StudentsPage() {
  return (
    <>
      <ScreenPlaceholder kicker="Parent" title="Students">
        Each child in the household, their grade, and whether they learn on screen or on paper.
      </ScreenPlaceholder>
    </>
  );
}
