import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Screen } from "@/components/Screen";
import { availableGrades } from "@/lib/content/load";
import { todayIn } from "@/lib/domain/dates";
import { currentHousehold } from "@/server/session";
import { SetupForm } from "./SetupForm";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Set up your household" };

export default async function StartPage() {
  if (await currentHousehold()) redirect("/parent");
  return (
    <Screen label="Set up">
      <div className={styles.wrap}>
        <div className={styles.kicker}>Begin enrollment</div>
        <h1 className={styles.title}>Set up your household</h1>
        <p className={styles.lede}>
          One household covers every child. Start with one; add the others from Settings. You can change anything here
          later.
        </p>
        <SetupForm today={todayIn("America/New_York")} loadedGrades={availableGrades()} />
      </div>
    </Screen>
  );
}
