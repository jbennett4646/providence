import type { Metadata } from "next";
import { Screen } from "@/components/Screen";
import { ScreenPlaceholder } from "@/components/ScreenPlaceholder";

export const metadata: Metadata = { title: "Records" };

export default function RecordsPage() {
  return (
    <Screen label="Records" tone="parchment" printPage>
      <ScreenPlaceholder kicker="Georgia home study" title="Records">
        Attendance, subjects and mastery, and the Georgia summary: 180 days, 4½ hours a day, five required subjects.
      </ScreenPlaceholder>
    </Screen>
  );
}
