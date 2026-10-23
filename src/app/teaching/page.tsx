import type { Metadata } from "next";
import { Screen } from "@/components/Screen";
import { ScreenPlaceholder } from "@/components/ScreenPlaceholder";

export const metadata: Metadata = { title: "Teaching today" };

export default function TeachingPage() {
  return (
    <Screen label="Teaching today" tone="teaching" printPage>
      <ScreenPlaceholder kicker="Today" title="Teaching today">
        The day for each child: the daily core and weekly queue on screen, or the print queue, check-ins and term checks on paper.
      </ScreenPlaceholder>
    </Screen>
  );
}
