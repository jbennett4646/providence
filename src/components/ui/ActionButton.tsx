"use client";

import { useTransition, type ReactNode } from "react";

type ActionButtonProps = {
  action: () => void | Promise<void>;
  className?: string;
  children: ReactNode;
  title?: string;
};

/** A button that runs a server action, disabled while it runs. */
export function ActionButton({ action, className, children, title }: ActionButtonProps) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className={className}
      disabled={pending}
      aria-busy={pending}
      title={title}
      onClick={() => start(async () => action())}
      style={pending ? { opacity: 0.6 } : undefined}
    >
      {children}
    </button>
  );
}
