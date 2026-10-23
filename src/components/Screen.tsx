import type { ReactNode } from "react";
import styles from "./Screen.module.css";

type ScreenProps = {
  /** Shown as the screen's label, as in the prototype's data-screen-label. */
  label: string;
  tone?: "parchment" | "teaching" | "dark";
  /** Print the screen as a plain white page (Teaching, Records). */
  printPage?: boolean;
  children: ReactNode;
};

/** A full-height screen below the top bar. */
export function Screen({ label, tone = "parchment", printPage, children }: ScreenProps) {
  return (
    <main
      data-screen-label={label}
      data-print-page={printPage ? "1" : undefined}
      className={`${styles.screen} ${styles[tone]}`}
    >
      {children}
    </main>
  );
}
