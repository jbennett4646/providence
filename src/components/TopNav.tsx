"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { isActive, topNav } from "@/lib/nav";
import styles from "./TopNav.module.css";

type TopNavProps = {
  /** Who is signed in, if anyone. Students see only their module. */
  account: { label: string; role: "parent" | "student" } | null;
  signOut: () => Promise<void>;
};

export function TopNav({ account, signOut }: TopNavProps) {
  const pathname = usePathname();
  const links = useRef<HTMLDivElement>(null);
  // On a phone the links scroll sideways: bring the current page's link into view.
  useEffect(() => {
    const row = links.current;
    const cur = row?.querySelector<HTMLElement>("[aria-current=page]");
    if (!row || !cur || row.scrollWidth <= row.clientWidth) return;
    row.scrollLeft = cur.offsetLeft - (row.clientWidth - cur.offsetWidth) / 2;
  }, [pathname]);
  const items = account?.role === "student" ? topNav.filter((i) => i.href === "/student" || i.href === "/faq" || i.href === "/") : topNav;
  return (
    <nav className={styles.bar} data-noprint="1" aria-label="Main">
      <Link href="/" className={styles.brand}>
        Providence Home Academy
      </Link>
      <div ref={links} className={styles.links}>
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
