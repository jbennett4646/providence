import { addDays, keyOf, MONTHS_LONG, toDate, weekday, yearOf, type DateKey } from "./dates";
import { holidayMap, nthWeekday } from "./holidays";

export type Break = { id: string; label: string; from: DateKey; to: DateKey };

export type CalendarInput = {
  /** First day of the school year. */
  start: DateKey;
  /** Weekdays taught, 0 = Sunday … 6 = Saturday. */
  schoolDays: number[];
  breaks: Break[];
  /** Federal holidays the family teaches on anyway. */
  holidaysTaught: Iterable<DateKey>;
  /** School days in the year (Georgia: 180). */
  requiredDays: number;
};

export type DayType = "before" | "rest" | "holiday" | "break" | "school" | "after";

export type CalendarCell = {
  date: DateKey;
  day: number;
  type: DayType;
  holiday: string | null;
  breakLabel: string | null;
  /** School day number, 1 … requiredDays, on school days. */
  dayNumber: number | null;
};

export type CalendarMonth = { name: string; schoolDays: number; leading: number; cells: CalendarCell[] };

export type SchoolCalendar = {
  start: DateKey;
  last: DateKey;
  requiredDays: number;
  holidays: Map<DateKey, string>;
  dayType(date: DateKey): DayType;
  breakAt(date: DateKey): Break | undefined;
  /** School day number of a planned school day, or null. */
  planned(date: DateKey): number | null;
  /** Planned school days up to and including the date. */
  dayCount(date: DateKey): number;
  /** The next holiday or break after the date, before the last day. */
  nextOff(after: DateKey): { label: string; date: DateKey; kind: "holiday" | "break" } | null;
  /** First and last dates of the planned days falling in a term (1–6, by school day number). */
  termRange(term: number): { from: DateKey; to: DateKey } | null;
  months(): CalendarMonth[];
};

/** Guard against a calendar with no teachable days. */
const MAX_SPAN_DAYS = 1000;

export function buildCalendar(input: CalendarInput): SchoolCalendar {
  const { start, requiredDays } = input;
  const schoolDays = new Set(input.schoolDays);
  const taught = new Set(input.holidaysTaught);
  const y = yearOf(start);
  const holidays = holidayMap([y, y + 1, y + 2]);
  const breaks = [...input.breaks].sort((a, b) => (a.from < b.from ? -1 : 1));

  const breakAt = (k: DateKey) => breaks.find((b) => k >= b.from && k <= b.to);
  const baseType = (k: DateKey): Exclude<DayType, "after"> => {
    if (k < start) return "before";
    if (!schoolDays.has(weekday(k))) return "rest";
    if (holidays.has(k) && !taught.has(k)) return "holiday";
    if (breakAt(k)) return "break";
    return "school";
  };

  const plan = new Map<DateKey, number>();
  const order: DateKey[] = [];
  let last = start;
  for (let k = start, guard = 0; order.length < requiredDays && guard < MAX_SPAN_DAYS; k = addDays(k, 1), guard++) {
    if (baseType(k) === "school") {
      order.push(k);
      plan.set(k, order.length);
      last = k;
    }
  }

  const dayType = (k: DateKey): DayType => (k > last ? "after" : baseType(k));

  const dayCount = (k: DateKey) => {
    // Binary search over the ordered plan.
    let lo = 0;
    let hi = order.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (order[mid] <= k) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  };

  const nextOff: SchoolCalendar["nextOff"] = (after) => {
    for (let k = addDays(after, 1); k <= last; k = addDays(k, 1)) {
      const t = dayType(k);
      if (t === "holiday") return { label: holidays.get(k)!, date: k, kind: "holiday" };
      if (t === "break") {
        const b = breakAt(k)!;
        return { label: b.label, date: b.from < k ? k : b.from, kind: "break" };
      }
    }
    return null;
  };

  const termRange = (term: number) => {
    const per = Math.ceil(requiredDays / 6);
    const from = order[(term - 1) * per];
    const to = order[Math.min(term * per, order.length) - 1];
    return from && to ? { from, to } : null;
  };

  const months = (): CalendarMonth[] => {
    const out: CalendarMonth[] = [];
    let year = yearOf(start);
    let month = toDate(start).getUTCMonth();
    const endYear = yearOf(last);
    const endMonth = toDate(last).getUTCMonth();
    while (year < endYear || (year === endYear && month <= endMonth)) {
      const first = keyOf(year, month, 1);
      const dim = toDate(keyOf(year, month + 1, 0)).getUTCDate();
      const cells: CalendarCell[] = [];
      for (let d = 1; d <= dim; d++) {
        const k = keyOf(year, month, d);
        const t = dayType(k);
        cells.push({
          date: k,
          day: d,
          type: t,
          holiday: holidays.get(k) ?? null,
          breakLabel: t === "break" ? breakAt(k)!.label : null,
          dayNumber: plan.get(k) ?? null,
        });
      }
      out.push({
        name: `${MONTHS_LONG[month]} ${year}`,
        schoolDays: cells.filter((c) => c.type === "school").length,
        leading: weekday(first),
        cells,
      });
      month++;
      if (month === 12) {
        month = 0;
        year++;
      }
    }
    return out;
  };

  return {
    start,
    last,
    requiredDays,
    holidays,
    dayType,
    breakAt,
    planned: (k) => plan.get(k) ?? null,
    dayCount,
    nextOff,
    termRange,
    months,
  };
}

/** School days a break takes out of the plan (weekdays taught that aren't holidays off). */
export function breakSchoolDays(b: Break, input: Pick<CalendarInput, "schoolDays" | "holidaysTaught">): number {
  const schoolDays = new Set(input.schoolDays);
  const taught = new Set(input.holidaysTaught);
  const holidays = holidayMap([yearOf(b.from), yearOf(b.to)]);
  let n = 0;
  for (let k = b.from; k <= b.to; k = addDays(k, 1)) {
    if (schoolDays.has(weekday(k)) && !(holidays.has(k) && !taught.has(k))) n++;
  }
  return n;
}

/** How far ahead of the first day suggested breaks may fall: roughly one school year. */
const SUGGEST_SPAN_DAYS = 300;

/** Suggested family breaks for a school year starting on `start`: Thanksgiving week, Christmas, spring break. */
export function defaultBreaks(start: DateKey): Omit<Break, "id">[] {
  const y = yearOf(start);
  const out: Omit<Break, "id">[] = [];
  for (const year of [y - 1, y, y + 1]) {
    const thanksgiving = nthWeekday(year, 10, 4, 4);
    const dec21 = keyOf(year, 11, 21);
    const christmasFrom = addDays(dec21, -((weekday(dec21) + 6) % 7));
    const springFrom = nthWeekday(year, 2, 1, 3);
    out.push(
      { label: "Spring break", from: springFrom, to: addDays(springFrom, 4) },
      { label: "Thanksgiving week", from: addDays(thanksgiving, -3), to: addDays(thanksgiving, 1) },
      { label: "Christmas break", from: christmasFrom, to: addDays(christmasFrom, 11) },
    );
  }
  const horizon = addDays(start, SUGGEST_SPAN_DAYS);
  return out.filter((b) => b.to >= start && b.from <= horizon).sort((a, b) => (a.from < b.from ? -1 : 1));
}

/** The prototype's two school-week patterns. */
export const MON_FRI = [1, 2, 3, 4, 5];
export const MON_SAT = [1, 2, 3, 4, 5, 6];
