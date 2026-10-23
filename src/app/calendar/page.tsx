import type { Metadata } from "next";
import { Screen } from "@/components/Screen";
import { ScreenPlaceholder } from "@/components/ScreenPlaceholder";

export const metadata: Metadata = { title: "School-year calendar" };

export default function CalendarPage() {
  return (
    <Screen label="Calendar" tone="parchment">
      <ScreenPlaceholder kicker="Calendar" title="School-year calendar">
        Thirty-six school weeks from your start date, with federal holidays and family breaks.
      </ScreenPlaceholder>
    </Screen>
  );
}
