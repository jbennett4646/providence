/*
 * Calendar dates as 'YYYY-MM-DD' strings. All arithmetic is done in UTC so a
 * date never shifts with the server's time zone.
 */

export type DateKey = string;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const WEEKDAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function isDateKey(s: unknown): s is DateKey {
  if (typeof s !== "string" || !DATE_RE.test(s)) return false;
  const d = toDate(s);
  return toKey(d) === s;
}

export function toDate(key: DateKey): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function toKey(d: Date): DateKey {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

export function keyOf(year: number, month0: number, day: number): DateKey {
  return toKey(new Date(Date.UTC(year, month0, day)));
}

export function addDays(key: DateKey, n: number): DateKey {
  const d = toDate(key);
  d.setUTCDate(d.getUTCDate() + n);
  return toKey(d);
}

/** 0 = Sunday … 6 = Saturday. */
export function weekday(key: DateKey): number {
  return toDate(key).getUTCDay();
}

export function yearOf(key: DateKey): number {
  return Number(key.slice(0, 4));
}

/** Monday of the week containing the date. */
export function weekStart(key: DateKey): DateKey {
  return addDays(key, -((weekday(key) + 6) % 7));
}

export function daysBetween(from: DateKey, to: DateKey): number {
  return Math.round((toDate(to).getTime() - toDate(from).getTime()) / 86_400_000);
}

/** "Mon 12 Oct" */
export function fmtShort(key: DateKey): string {
  const d = toDate(key);
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/** "Mon 12 Oct 2026" */
export function fmtLong(key: DateKey): string {
  return `${fmtShort(key)} ${yearOf(key)}`;
}

/** "Monday · 12 October" */
export function fmtKicker(key: DateKey): string {
  const d = toDate(key);
  return `${WEEKDAYS_LONG[d.getUTCDay()]} · ${d.getUTCDate()} ${MONTHS_LONG[d.getUTCMonth()]}`;
}

/** "12 Oct" */
export function fmtDayMonth(key: DateKey): string {
  const d = toDate(key);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/** Today's date in a time zone (IANA name). */
export function todayIn(timeZone: string, now: Date = new Date()): DateKey {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  return parts;
}
