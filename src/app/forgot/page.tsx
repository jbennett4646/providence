import type { Metadata } from "next";
import Link from "next/link";
import styles from "@/components/auth/Auth.module.css";
import { Screen } from "@/components/Screen";
import { ForgotForm } from "./ForgotForm";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPage() {
  return (
    <Screen label="Forgot password">
      <div className={styles.wrap}>
        <div className={styles.kicker}>Your account</div>
        <h1 className={styles.title}>Reset your password</h1>
        <p className={styles.lede}>Enter the email you signed up with and we’ll send a link to choose a new password. Students: ask your parent to reset yours from Settings.</p>
        <ForgotForm />
        <p className={styles.foot}>
          <Link href="/sign-in">Back to sign in</Link>
        </p>
      </div>
    </Screen>
  );
}
