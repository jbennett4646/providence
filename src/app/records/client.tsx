"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cx, ui } from "@/components/ui/Controls";
import { Switch } from "@/components/ui/Switch";

export function IncompleteSwitch({ on }: { on: boolean }) {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  return (
    <Switch
      on={on}
      label="Show incomplete only"
      onToggle={() => {
        const p = new URLSearchParams(params);
        if (on) p.delete("incomplete");
        else p.set("incomplete", "1");
        router.replace(`${path}?${p}`);
      }}
    />
  );
}

/** On the transcript, prints it; elsewhere, opens the transcript first. */
export function PrintTranscript({ onTranscript, href }: { onTranscript: boolean; href: string }) {
  if (onTranscript) {
    return (
      <button type="button" className={cx(ui.btn, ui.outline)} onClick={() => window.print()}>
        Print transcript
      </button>
    );
  }
  return (
    <Link href={href} className={cx(ui.btn, ui.outline)}>
      Print transcript
    </Link>
  );
}
