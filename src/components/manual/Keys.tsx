"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { Switch } from "@/components/ui/Switch";
import styles from "./Blocks.module.css";

/*
 * Answer keys are hidden by default and shown for the whole page at once,
 * from the page's switch or from any hidden key.
 */

const KeysContext = createContext<{ on: boolean; toggle: () => void }>({ on: false, toggle: () => {} });

export function KeysProvider({ children, initial = false }: { children: ReactNode; initial?: boolean }) {
  const [on, setOn] = useState(initial);
  return <KeysContext.Provider value={{ on, toggle: () => setOn((v) => !v) }}>{children}</KeysContext.Provider>;
}

export function KeysSwitch() {
  const { on, toggle } = useContext(KeysContext);
  return <Switch on={on} label="Show answer keys" onToggle={toggle} />;
}

export function AnswerKey({ text }: { text: string }) {
  const { on, toggle } = useContext(KeysContext);
  if (on) {
    return (
      <div data-noprint="1" className={styles.key}>
        <div className={styles.keyLabel}>Answer key · parent only</div>
        <div className={styles.keyText}>{text}</div>
      </div>
    );
  }
  return (
    <button type="button" data-noprint="1" className={styles.keyHidden} onClick={toggle}>
      Answer key hidden · show
    </button>
  );
}
