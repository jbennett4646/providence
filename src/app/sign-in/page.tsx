import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import styles from "@/components/auth/Auth.module.css";
import { Crest } from "@/components/Crest";
import { Screen } from "@/components/Screen";
import { getSession } from "@/server/session";
import { SignInForm } from "./SignInForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; reset?: string }> }) {
  const sp = await searchParams;
  const s = await getSession();
  if (s) redirect(s.user.role === "student" ? "/student" : "/parent");
  return (
    <Screen label="Sign in">
      <div className={styles.wrap}>
        <div className={styles.crest}>
          <Crest />
        </div>
        <div className={styles.kicker}>Providence Home Academy</div>
        <h1 className={styles.title}>Sign in</h1>
        <p className={styles.lede}>Parents sign in with their email. Students from Grade 6 sign in with the username their parent gave them.</p>
        {sp.reset && <p className={styles.ok}>Your password is changed. Sign in with the new one.</p>}
        <SignInForm next={sp.next ?? ""} />
        <p className={styles.foot}>
          New here? <Link href="/start">Set up your household</Link>.
        </p>
      </div>
    </Screen>
  );
}
