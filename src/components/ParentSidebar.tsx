"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActive, parentNav } from "@/lib/nav";
import { Crest } from "./Crest";
import styles from "./ParentSidebar.module.css";

type ParentSidebarProps = {
  householdName: string;
  householdMeta: string;
  /** Optional counts shown at the right of a nav row, keyed by href. */
  badges?: Record<string, string | number>;
};

export function ParentSidebar({ householdName, householdMeta, badges = {} }: ParentSidebarProps) {
  const pathname = usePathname();
  return (
    <aside className={styles.sidebar} data-noprint="1">
      <div className={styles.brand}>
        <Crest width={22} height={25} stroke={[1.6, 1.2]} />
        <span>Providence</span>
      </div>
      <nav className={styles.nav} aria-label="Parent">
        {parentNav.map((item) => {
          const active = !item.href.includes("#") && isActive(item, pathname, item.href === "/parent");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[styles.item, active && styles.active].filter(Boolean).join(" ")}
              aria-current={active ? "page" : undefined}
            >
              {item.label}
              <span className={styles.badge}>{badges[item.href] ?? ""}</span>
            </Link>
          );
        })}
      </nav>
      <div className={styles.household}>
        <div className={styles.householdKicker}>Household</div>
        <div className={styles.householdName}>{householdName}</div>
        <div className={styles.householdMeta}>{householdMeta}</div>
      </div>
    </aside>
  );
}
