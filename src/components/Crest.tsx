type CrestProps = {
  width?: number;
  height?: number;
  /** Stroke widths for the shield and the cross. */
  stroke?: [number, number];
};

/** The academy crest: a shield with a cross, stroked in the accent gold. */
export function Crest({ width = 30, height = 34, stroke = [1.4, 1.1] }: CrestProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 30 34" fill="none" aria-hidden="true">
      <path
        d="M1 1h28v19.5C29 27 22.5 31 15 33 7.5 31 1 27 1 20.5V1Z"
        stroke="var(--pa-accent)"
        strokeWidth={stroke[0]}
      />
      <path d="M15 6v20M6 16h18" stroke="var(--pa-accent)" strokeWidth={stroke[1]} />
    </svg>
  );
}
