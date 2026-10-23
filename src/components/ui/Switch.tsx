"use client";

import { useTransition } from "react";
import { cx, ui } from "./Controls";

type SwitchProps = {
  on: boolean;
  label: string;
  onToggle: () => void | Promise<void>;
  small?: boolean;
};

/** The prototype's square sliding switch. */
export function Switch({ on, label, onToggle, small }: SwitchProps) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={pending}
      className={cx(ui.switch, on && ui.switchOn, small && ui.switchSmall)}
      onClick={() => start(async () => onToggle())}
    />
  );
}
