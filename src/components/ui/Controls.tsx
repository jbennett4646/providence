import styles from "./ui.module.css";

export { styles as ui };

/** Join class names, skipping falsy ones. */
export function cx(...names: (string | false | null | undefined)[]): string {
  return names.filter(Boolean).join(" ");
}

export function CheckMark({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.8} viewBox="0 0 13 10" fill="none" aria-hidden="true">
      <path d="M1 5l4 4 7-8" stroke="#F2EEE4" strokeWidth="1.8" />
    </svg>
  );
}

export function Tick({ on }: { on: boolean }) {
  return <span className={cx(styles.tick, on && styles.tickOn)}>{on && <CheckMark />}</span>;
}
