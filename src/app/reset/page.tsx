import type { Metadata } from "next";
import Link from "next/link";
import styles from "@/components/auth/Auth.module.css";
import { Screen } from "@/components/Screen";
import { ResetForm } from "./ResetForm";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <Screen label="Reset password">
      <div className={styles.wrap}>
        <div className={styles.kicker}>Your account</div>
        <h1 className={styles.title}>Choose a new password</h1>
        {token ? (
          <>
            <p className={styles.lede}>Choosing a new password signs you out everywhere else.</p>
            <ResetForm token={token} />
          </>
        ) : (
          <p className={styles.lede}>
            This link is missing its code. <Link href="/forgot">Ask for a new one</Link>.
          </p>
        )}
      </div>
    </Screen>
  );
}
