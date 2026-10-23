import type { Metadata } from "next";
import { ScreenPlaceholder } from "@/components/ScreenPlaceholder";

export const metadata: Metadata = { title: "Dashboard" };

export default function ParentDashboardPage() {
  return (
    <>
      <ScreenPlaceholder kicker="Parent" title="Dashboard">
        Where each course stands, the floor course, the school year and attendance, and electives for each child.
      </ScreenPlaceholder>
    </>
  );
}
