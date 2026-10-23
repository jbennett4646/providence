import { addDays, keyOf, weekday, type DateKey } from "./dates";

/** The nth (1-based) given weekday of a month. */
function nthWeekday(year: number, month0: number, wd: number, n: number): DateKey {
  const first = keyOf(year, month0, 1);
  return addDays(first, ((wd - weekday(first) + 7) % 7) + (n - 1) * 7);
}

function lastWeekday(year: number, month0: number, wd: number): DateKey {
  const last = keyOf(year, month0 + 1, 0);
  return addDays(last, -((weekday(last) - wd + 7) % 7));
}

/** Saturday holidays are observed on Friday, Sunday ones on Monday. */
function observed(key: DateKey): DateKey {
  const wd = weekday(key);
  return wd === 6 ? addDays(key, -1) : wd === 0 ? addDays(key, 1) : key;
}

export type Holiday = { name: string; date: DateKey };

/** US federal holidays for a calendar year, on their observed dates. */
export function federalHolidays(year: number): Holiday[] {
  return [
    { name: "New Year’s Day", date: observed(keyOf(year, 0, 1)) },
    { name: "Martin Luther King Jr. Day", date: nthWeekday(year, 0, 1, 3) },
    { name: "Presidents’ Day", date: nthWeekday(year, 1, 1, 3) },
    { name: "Memorial Day", date: lastWeekday(year, 4, 1) },
    { name: "Juneteenth", date: observed(keyOf(year, 5, 19)) },
    { name: "Independence Day", date: observed(keyOf(year, 6, 4)) },
    { name: "Labor Day", date: nthWeekday(year, 8, 1, 1) },
    { name: "Columbus Day", date: nthWeekday(year, 9, 1, 2) },
    { name: "Veterans Day", date: observed(keyOf(year, 10, 11)) },
    { name: "Thanksgiving Day", date: nthWeekday(year, 10, 4, 4) },
    { name: "Christmas Day", date: observed(keyOf(year, 11, 25)) },
  ];
}

/** Holidays by date for the given years. */
export function holidayMap(years: number[]): Map<DateKey, string> {
  const m = new Map<DateKey, string>();
  for (const y of years) for (const h of federalHolidays(y)) m.set(h.date, h.name);
  return m;
}

export { nthWeekday };
