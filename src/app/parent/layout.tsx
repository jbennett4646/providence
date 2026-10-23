import type { ReactNode } from "react";
import { ParentSidebar } from "@/components/ParentSidebar";
import styles from "./layout.module.css";

export default function ParentLayout({ children }: { children: ReactNode }) {
  // Household details come from the signed-in account once accounts land (task 5).
  return (
    <div className={styles.shell} data-screen-label="Parent dashboard">
      <ParentSidebar householdName="Your household" householdMeta="Household plan" />
      <main className={styles.main}>{children}</main>
    </div>
  );
}
