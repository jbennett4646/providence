import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./MarketingFooter.module.css";

/** The dark strip at the foot of the public pages. */
export function MarketingFooter({ children }: { children: ReactNode }) {
  return (
    <footer className={styles.footer}>
      <div className={styles.wrap}>
        <span className={styles.name}>PROVIDENCE HOME ACADEMY</span>
        {children}
      </div>
    </footer>
  );
}

/** A quiet link for the right-hand side of the footer. */
export function MarketingFooterLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={styles.link}>
      {children}
    </Link>
  );
}
