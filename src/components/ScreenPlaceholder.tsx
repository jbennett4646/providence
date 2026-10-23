import type { ReactNode } from "react";
import styles from "./ScreenPlaceholder.module.css";

type ScreenPlaceholderProps = {
  kicker: string;
  title: string;
  children?: ReactNode;
};

/** Header band and note for a screen whose port has not landed yet. */
export function ScreenPlaceholder({ kicker, title, children }: ScreenPlaceholderProps) {
  return (
    <>
      <div className={styles.band}>
        <div className={styles.kicker}>{kicker}</div>
        <h1 className={styles.title}>{title}</h1>
      </div>
      <div className={styles.body}>
        <div className={styles.card}>{children}</div>
      </div>
    </>
  );
}
