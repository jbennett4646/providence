"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActive, topNav } from "@/lib/nav";
import styles from "./TopNav.module.css";

export function TopNav() {
  const pathname = usePathname();
  return (
    <nav className={styles.bar} data-noprint="1" aria-label="Main">
      <Link href="/" className={styles.brand}>
        Providence Home Academy
      </Link>
      <div className={styles.links}>
        {topNav.map((item) => {
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
    </nav>
  );
}
