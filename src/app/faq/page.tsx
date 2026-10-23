import type { Metadata } from "next";
import { Screen } from "@/components/Screen";
import { ScreenPlaceholder } from "@/components/ScreenPlaceholder";

export const metadata: Metadata = { title: "Questions families ask" };

export default function FaqPage() {
  return (
    <Screen label="FAQ" tone="parchment">
      <ScreenPlaceholder kicker="FAQ" title="Questions families ask">
        Joining, the school day, records and Georgia law, other states, and tuition.
      </ScreenPlaceholder>
    </Screen>
  );
}
