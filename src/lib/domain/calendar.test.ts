import { describe, expect, it } from "vitest";
import { buildCalendar, breakSchoolDays, defaultBreaks, MON_FRI, MON_SAT } from "./calendar";
import { addDays, fmtLong, weekStart } from "./dates";
import { federalHolidays } from "./holidays";

const DEMO_BREAKS = [
  { id: "tg", label: "Thanksgiving week", from: "2026-11-23", to: "2026-11-27" },
  { id: "xm", label: "Christmas break", from: "2026-12-21", to: "2027-01-01" },
  { id: "sp", label: "Spring break", from: "2027-03-15", to: "2027-03-19" },
];

describe("federal holidays", () => {
  it("lands on the right dates in 2026", () => {
    const h = Object.fromEntries(federalHolidays(2026).map((x) => [x.name, x.date]));
    expect(h["Labor Day"]).toBe("2026-09-07");
    expect(h["Columbus Day"]).toBe("2026-10-12");
    expect(h["Thanksgiving Day"]).toBe("2026-11-26");
    expect(h["Memorial Day"]).toBe("2026-05-25");
    // 4 July 2026 is a Saturday, observed Friday 3 July.
    expect(h["Independence Day"]).toBe("2026-07-03");
    expect(h["Veterans Day"]).toBe("2026-11-11");
  });

  it("observes a Sunday holiday on Monday", () => {
    // 1 January 2023 was a Sunday.
    expect(federalHolidays(2023).find((x) => x.name === "New Year’s Day")!.date).toBe("2023-01-02");
  });
});

describe("school calendar", () => {
  const cal = buildCalendar({ start: "2026-08-10", schoolDays: MON_FRI, breaks: DEMO_BREAKS, holidaysTaught: [], requiredDays: 180 });

  it("plans 180 school days around weekends, holidays and breaks", () => {
    expect(cal.planned("2026-08-10")).toBe(1);
    expect(cal.dayType("2026-08-15")).toBe("rest");
    expect(cal.dayType("2026-09-07")).toBe("holiday");
    expect(cal.dayType("2026-11-24")).toBe("break");
    expect(cal.dayType("2026-08-09")).toBe("before");
    expect(cal.planned(cal.last)).toBe(180);
    expect(cal.dayType(addDays(cal.last, 3))).toBe("after");
    expect(fmtLong(cal.last)).toBe("Fri 21 May 2027");
  });

  it("counts school days to date", () => {
    expect(cal.dayCount("2026-08-09")).toBe(0);
    expect(cal.dayCount("2026-08-14")).toBe(5);
    // Labor Day is not a school day.
    expect(cal.dayCount("2026-09-08")).toBe(cal.dayCount("2026-09-04") + 1);
  });

  it("moves the last day when a holiday is taught or a break is removed", () => {
    const taught = buildCalendar({ start: "2026-08-10", schoolDays: MON_FRI, breaks: DEMO_BREAKS, holidaysTaught: ["2026-09-07"], requiredDays: 180 });
    expect(taught.dayType("2026-09-07")).toBe("school");
    expect(taught.last < cal.last).toBe(true);
    const noBreaks = buildCalendar({ start: "2026-08-10", schoolDays: MON_FRI, breaks: [], holidaysTaught: [], requiredDays: 180 });
    expect(noBreaks.last < cal.last).toBe(true);
  });

  it("teaches Saturdays on a Monday-to-Saturday week", () => {
    const six = buildCalendar({ start: "2026-08-10", schoolDays: MON_SAT, breaks: [], holidaysTaught: [], requiredDays: 180 });
    expect(six.dayType("2026-08-15")).toBe("school");
    expect(six.dayType("2026-08-16")).toBe("rest");
  });

  it("finds the next day off", () => {
    expect(cal.nextOff("2026-10-01")).toEqual({ label: "Columbus Day", date: "2026-10-12", kind: "holiday" });
    expect(cal.nextOff("2026-11-12")).toEqual({ label: "Thanksgiving week", date: "2026-11-23", kind: "break" });
    expect(cal.nextOff(cal.last)).toBeNull();
  });

  it("lays out months from the first day to the last", () => {
    const months = cal.months();
    expect(months[0].name).toBe("August 2026");
    expect(months.at(-1)!.name).toBe("May 2027");
    expect(months[0].leading).toBe(6); // 1 August 2026 is a Saturday
    expect(months.reduce((a, m) => a + m.schoolDays, 0)).toBe(180);
  });

  it("splits the year into six terms of 30 school days", () => {
    expect(cal.termRange(1)).toEqual({ from: "2026-08-10", to: cal.months()[1].cells.find((c) => c.dayNumber === 30)!.date });
    expect(cal.termRange(6)!.to).toBe(cal.last);
  });
});

describe("breaks", () => {
  it("counts school days in a break, skipping holidays off", () => {
    expect(breakSchoolDays(DEMO_BREAKS[0], { schoolDays: MON_FRI, holidaysTaught: [] })).toBe(4);
    expect(breakSchoolDays(DEMO_BREAKS[1], { schoolDays: MON_FRI, holidaysTaught: [] })).toBe(8);
  });

  it("suggests the usual three breaks for the year", () => {
    expect(defaultBreaks("2026-08-10")).toEqual(DEMO_BREAKS.map((b) => ({ label: b.label, from: b.from, to: b.to })));
    // A year starting in January keeps only the breaks still ahead.
    expect(defaultBreaks("2027-01-04")).toEqual([{ label: "Spring break", from: "2027-03-15", to: "2027-03-19" }]);
  });
});

describe("dates", () => {
  it("finds the Monday of a week", () => {
    expect(weekStart("2026-10-21")).toBe("2026-10-19");
    expect(weekStart("2026-10-25")).toBe("2026-10-19");
    expect(weekStart("2026-10-19")).toBe("2026-10-19");
  });
});
