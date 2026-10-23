"use client";

import { useEffect, useRef } from "react";
import { markPrinted } from "@/app/actions";
import { cx, ui } from "@/components/ui/Controls";
import styles from "./page.module.css";

type Doc = { grade: number; courseId: string; doc: string };

/**
 * Records the booklets as printed (as the prototype did when Print was
 * pressed) and opens the print dialog once.
 */
export function PrintToolbar({ childId, docs, title }: { childId: string; docs: Doc[]; title: string }) {
  const done = useRef(false);
  useEffect(() => {
    if (!done.current) {
      done.current = true;
      void markPrinted(childId, docs);
    }
    const t = window.setTimeout(() => window.print(), 400);
    return () => window.clearTimeout(t);
  }, [childId, docs]);
  return (
    <div data-noprint="1" className={styles.toolbar}>
      <span className={styles.toolbarTitle}>{title}</span>
      <span className={styles.toolbarNote}>Prints on letter paper. The answer key comes last; take it out before teaching.</span>
      <button type="button" className={cx(ui.btn, ui.dark)} onClick={() => window.print()}>
        Print
      </button>
    </div>
  );
}
