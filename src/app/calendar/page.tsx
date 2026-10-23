import type { Metadata } from "next";
import Link from "next/link";
import { cx, ui } from "@/components/ui/Controls";
import { breakSchoolDays, MON_SAT } from "@/lib/domain/calendar";
import { fmtLong, fmtShort, weekday, yearOf } from "@/lib/domain/dates";
import { requireHousehold } from "@/server/session";
import { householdContext } from "@/server/state";
import { AddBreak, BreakRemove, CalendarGrid, HolidaySwitch, ResetCalendar, SchoolDaysChoice, StartDate, type Cell, type Month } from "./client";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Calendar" };

const WEEK_NAMES: Record<string, string> = { "1,2,3,4,5": "Monday to Friday", "1,2,3,4,5,6": "Monday to Saturday" };

export default async function CalendarPage() {
  const household = await requireHousehold();
  const { calendar: cal, today, requiredDays, rules } = householdContext(household);
  const taught = new Set(household.holidayTeach);
  const days = [...household.schoolDays].sort().join(",");
  const weekName = WEEK_NAMES[days] ?? "on your chosen days";

  const months: Month[] = cal.months().map((m) => ({
    name: m.name,
    count: m.schoolDays ? `${m.schoolDays} school days` : "",
    leading: m.leading,
    cells: m.cells.map((c): Cell => {
      const b = c.type === "break" ? cal.breakAt(c.date) : undefined;
      let note = "";
      let action: Cell["action"] = null;
      if (c.type === "school") {
        note = `School day ${c.dayNumber} of ${requiredDays}${c.holiday ? `. ${c.holiday}, taught as a school day.` : "."}`;
        if (c.holiday) action = { label: "Make it a day off again", kind: "holiday" };
      } else if (c.type === "holiday") {
        note = `${c.holiday}. A federal holiday and a day off: the streak skips it. If you teach anyway, it all counts.`;
        action = { label: "Make it a school day", kind: "holiday" };
      } else if (c.type === "break" && b) {
        note = `${b.label}, ${fmtShort(b.from)} to ${fmtShort(b.to)}. Nothing is expected, and the streak waits.`;
        action = { label: "Remove this break", kind: "break", id: b.id };
      } else if (c.type === "rest") {
        note = weekday(c.date) === 0 || weekday(c.date) === 6 ? "Weekend. A rest day." : "Not one of your school days. A rest day.";
      } else if (c.type === "before") {
        note = "Before the first day of school.";
        if (household.schoolDays.includes(weekday(c.date))) action = { label: "Start the year on this day", kind: "start" };
      } else note = "After the last day of school.";
      return {
        date: c.date,
        day: c.day,
        type: c.type,
        ends: c.date === cal.start || c.date === cal.last,
        today: c.date === today,
        holidayName: c.holiday,
        tip: `${fmtShort(c.date)}${c.holiday ? ` · ${c.holiday}` : ""}${b ? ` · ${b.label}` : ""}`,
        title: fmtLong(c.date),
        note,
        action,
      };
    }),
  }));

  const holidays = [...cal.holidays.entries()]
    .filter(([d]) => d >= cal.start && d <= cal.last && household.schoolDays.includes(weekday(d)))
    .sort(([a], [b]) => (a < b ? -1 : 1));
  const breaks = household.breaks.filter((b) => b.to >= cal.start);

  return (
    <main data-screen-label="Calendar" className={styles.screen}>
      <div className={styles.wrap}>
        <Link href="/parent" className={ui.back}>
          ← Dashboard
        </Link>
        <div className={styles.head}>
          <div>
            <div className={ui.kicker}>
              School year {yearOf(cal.start)}–{String(yearOf(cal.start) + 1).slice(2)} · Household calendar
            </div>
            <h1 className={styles.title}>
              {fmtLong(cal.start)} to {fmtLong(cal.last)}
            </h1>
            <div className={styles.sub}>
              {requiredDays} school days, {weekName} · Day {cal.dayCount(today)} of {requiredDays} today
            </div>
          </div>
          <div className={styles.legend}>
            <span><i className={styles.lgSchool} />School day</span>
            <span><i className={styles.lgHoliday} />Federal holiday</span>
            <span><i className={styles.lgBreak} />Break</span>
            <span><i className={styles.lgEnds} />First and last day</span>
            <span><i className={styles.lgToday} />Today</span>
          </div>
        </div>

        <div className={styles.cols}>
          <CalendarGrid months={months} initial={cal.dayType(today) === "after" ? cal.last : today < cal.start ? cal.start : today} />

          <div className={styles.side}>
            <div className={cx(ui.card, styles.box)}>
              <div className={styles.boxTitle}>The school year</div>
              <div className={styles.label}>First day</div>
              <StartDate value={cal.start} />
              <div className={styles.kv}>
                <span>Last day (day {requiredDays})</span>
                <span className={styles.kvVal}>{fmtLong(cal.last)}</span>
              </div>
              <div className={styles.label}>School days</div>
              <SchoolDaysChoice value={days === MON_SAT.join(",") ? "ms" : "mf"} />
              <div className={styles.note}>
                {rules ? `${rules.name} asks for ${requiredDays} days of 4½ hours.` : `The record plans ${requiredDays} days of 4½ hours.`} The last day works itself out from the first day,
                the holidays and your breaks.
              </div>
            </div>

            <div className={cx(ui.card, styles.box)}>
              <div className={styles.boxTitle}>Three kinds of days off</div>
              <div className={styles.kinds}>
                <div><span className={styles.deep}>Federal holidays</span> are built in. Turn any of them into a school day.</div>
                <div><span className={styles.green}>Breaks</span> are your own, planned ahead, as many as you like. Each one moves the last day later, so the {requiredDays} days look after themselves.</div>
                <div><span>Sick and travel days</span> are unplanned. Mark them on the day from Teaching. Five a term.</div>
              </div>
              <div className={styles.kindsFoot}>On any day off, teaching still counts. It adds to the streak and to the attendance log.</div>
            </div>

            <div className={cx(ui.card, styles.box)}>
              <div className={styles.boxHead}>
                <span className={styles.boxTitle}>Federal holidays</span>
                <span className={styles.boxMeta}>Day off</span>
              </div>
              {holidays.map(([date, name]) => (
                <div key={date} className={styles.row}>
                  <div className={styles.rowText}>
                    <div className={styles.rowName}>{name}</div>
                    <div className={styles.rowMeta}>{fmtShort(date)}</div>
                  </div>
                  <HolidaySwitch date={date} name={name} off={!taught.has(date)} />
                </div>
              ))}
            </div>

            <div className={cx(ui.card, styles.box)}>
              <div className={styles.boxTitle}>Breaks</div>
              {breaks.length === 0 && <div className={styles.rowMeta}>No breaks planned.</div>}
              {breaks.map((b) => {
                const n = breakSchoolDays(b, { schoolDays: household.schoolDays, holidaysTaught: household.holidayTeach });
                return (
                  <div key={b.id} className={styles.row}>
                    <div className={styles.rowText}>
                      <div className={styles.rowName}>{b.label}</div>
                      <div className={styles.rowMeta}>
                        {fmtShort(b.from)} – {fmtShort(b.to)} · {n} {n === 1 ? "school day" : "school days"}
                      </div>
                    </div>
                    <BreakRemove id={b.id} />
                  </div>
                );
              })}
              <div className={styles.label}>Add a break</div>
              <AddBreak />
              <ResetCalendar />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
