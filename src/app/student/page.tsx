import type { Metadata } from "next";
import { Screen } from "@/components/Screen";
import { ScreenPlaceholder } from "@/components/ScreenPlaceholder";

export const metadata: Metadata = { title: "Student module" };

export default function StudentPage() {
  return (
    <Screen label="Student module (locked)" tone="dark">
      <ScreenPlaceholder kicker="Grades 6–12" title="Student module">
        Students from Grade 6 get their own login. This module is not open yet.
      </ScreenPlaceholder>
    </Screen>
  );
}
