import type { InputHTMLAttributes } from "react";
import { ui } from "@/components/ui/Controls";
import styles from "./Auth.module.css";

export function Field({ label, hint, ...input }: { label: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      <input className={ui.input} {...input} />
      {hint && <span className={styles.hint}>{hint}</span>}
    </label>
  );
}
