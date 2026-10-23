import type { ReactNode } from "react";
import { ParentSidebar } from "@/components/ParentSidebar";
import { requireHousehold } from "@/server/session";
import styles from "./layout.module.css";

const PLAN_LABEL = { household: "Household plan", parish: "Parish & co-op plan" } as const;

export default async function ParentLayout({ children }: { children: ReactNode }) {
  const h = await requireHousehold();
  const n = h.children.length;
  const meta = `${h.plan ? PLAN_LABEL[h.plan] : "No plan yet"} · ${n} ${n === 1 ? "student" : "students"}`;
  return (
    <div className={styles.shell} data-screen-label="Parent dashboard">
      <ParentSidebar householdName={h.name} householdMeta={meta} />
      <div className={styles.main}>{children}</div>
    </div>
  );
}
