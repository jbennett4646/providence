"use client";

import type { ReactNode } from "react";
import type { PrintDoc } from "@/server/teaching";

/** Opens the booklet for printing in a new tab; the booklet page records the print. */
export function PrintLink({ childId, docs, className, children }: { childId: string; docs: PrintDoc[]; className?: string; children: ReactNode }) {
  const q = docs.map((d) => `${d.grade}:${d.courseId}:${d.doc}`).join(",");
  return (
    <a href={`/print?child=${childId}&docs=${encodeURIComponent(q)}`} target="_blank" rel="noopener" className={className}>
      {children}
    </a>
  );
}
