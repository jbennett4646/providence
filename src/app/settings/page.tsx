import type { Metadata } from "next";
import { Screen } from "@/components/Screen";
import { ScreenPlaceholder } from "@/components/ScreenPlaceholder";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <Screen label="Settings" tone="parchment">
      <ScreenPlaceholder kicker="Household" title="Settings">
        School days, holidays and the flex-day limit, household preferences, children, and plan and billing.
      </ScreenPlaceholder>
    </Screen>
  );
}
