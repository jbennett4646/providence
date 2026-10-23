import type { SchoolCalendar } from "./calendar";
import { addDays, type DateKey } from "./dates";

export type StreakStatus = "done" | "sick" | "travel";

/** Pause days (sick or travel) allowed per term. */
export const PAUSES_PER_TERM = 5;

const isPause = (v: StreakStatus | undefined) => v === "sick" || v === "travel";

/**
 * School days in a row with the daily core done, counting back from
 * yesterday. Pause days keep the streak without adding to it; a planned
 * school day with nothing recorded breaks it. Work done on a day off counts.
 */
export function streakLength(
  log: Map<DateKey, StreakStatus>,
  cal: SchoolCalendar,
  today: DateKey,
  todayDone: boolean,
): number {
  let n = 0;
  for (let d = addDays(today, -1); d >= cal.start; d = addDays(d, -1)) {
    const v = log.get(d);
    if (cal.dayType(d) === "school") {
      if (v === "done") n++;
      else if (!isPause(v)) break;
    } else if (v === "done") n++;
  }
  return todayDone ? n + 1 : n;
}

/** Pause days used in the term (by school day number) that today falls in. */
export function pausesUsed(log: Map<DateKey, StreakStatus>, cal: SchoolCalendar, today: DateKey): number {
  const count = Math.max(1, cal.dayCount(today));
  const term = Math.min(6, Math.ceil(count / Math.ceil(cal.requiredDays / 6)));
  const range = cal.termRange(term);
  if (!range) return 0;
  let n = 0;
  for (const [d, v] of log) if (isPause(v) && d >= range.from && d <= range.to) n++;
  return n;
}
