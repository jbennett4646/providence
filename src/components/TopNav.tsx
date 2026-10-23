"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActive, topNav } from "@/lib/nav";
import styles from "./TopNav.module.css";

type TopNavProps = {
  /** Who is signed in, if anyone. Students see only their module. */
  account: { label: string; role: "parent" | "student" } | null;
  signOut: () => Promise<void>;
};

export function TopNav({ account, signOut }: TopNavProps) {
  const pathname = usePathname();
  const items = account?.role === "student" ? topNav.filter((i) => i.href === "/student" || i.href === "/faq" || i.href === "/") : topNav;
  return (
    <nav className={styles.bar} data-noprint="1" aria-label="Main">
      <Link href="/" className={styles.brand}>
        Providence Home Academy
      </Link>
      <div className={styles.links}>
        {items.map((item) => {
          const active = isActive(item, pathname);
          const cls = [styles.link, item.muted && styles.muted, active && styles.active]
            .filter(Boolean)
            .join(" ");
          return (
            <Link key={item.href} href={item.href} className={cls} aria-current={active ? "page" : undefined}>
              {item.label}
            </Link>
          );
        })}
      </div>
      <div className={styles.account}>
        {account ? (
          <>
            <span className={styles.who}>{account.label}</span>
            <form action={signOut}>
              <button type="submit" className={styles.signOut}>
                Sign out
              </button>
            </form>
          </>
        ) : (
          <Link href="/sign-in" className={styles.signIn}>
            Sign in
          </Link>
        )}
      </div>
    </nav>
  );
}
