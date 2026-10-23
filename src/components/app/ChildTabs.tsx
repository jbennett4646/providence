"use client";

import { useTransition } from "react";
import { selectChild } from "@/app/actions";
import { cx, ui } from "@/components/ui/Controls";
import styles from "./ChildTabs.module.css";

type Tab = { id: string; name: string; grade: string };

/** The dashboard's child tabs. */
export function ChildTabs({ tabs, selected }: { tabs: Tab[]; selected: string }) {
  const [, start] = useTransition();
  return (
    <div className={styles.tabs} role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={t.id === selected}
          className={cx(styles.tab, t.id === selected && styles.on)}
          onClick={() => t.id !== selected && start(() => selectChild(t.id))}
        >
          <span className={styles.name}>{t.name}</span>
          <span className={styles.grade}>{t.grade}</span>
        </button>
      ))}
    </div>
  );
}

/** Teaching's child pills. */
export function ChildPills({ tabs, selected }: { tabs: Omit<Tab, "grade">[]; selected: string }) {
  const [, start] = useTransition();
  if (tabs.length < 2) return null;
  return (
    <div data-noprint="1" className={styles.pills}>
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          className={cx(ui.pill, t.id === selected && ui.pillOn)}
          aria-pressed={t.id === selected}
          onClick={() => t.id !== selected && start(() => selectChild(t.id))}
        >
          {t.name}
        </button>
      ))}
    </div>
  );
}
