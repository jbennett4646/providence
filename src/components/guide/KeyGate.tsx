"use client";

import type { ReactNode } from "react";
import { useKeys } from "@/components/manual/Keys";
import styles from "@/components/manual/Blocks.module.css";

/** Shows its children only while answer keys are on, like the manuals' answer keys. */
export function KeyGate({ children }: { children: ReactNode }) {
  const { on, toggle } = useKeys();
  if (on) return <>{children}</>;
  return (
    <button type="button" data-noprint="1" className={styles.keyHidden} onClick={toggle}>
      Answer key hidden · show
    </button>
  );
}
