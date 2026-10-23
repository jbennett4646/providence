import "server-only";
import type { Block, Course, Week, WeekItem } from "@/lib/content/schema";
import { getWeek } from "@/lib/content/load";
import { isGateWeek, termOfWeek } from "@/lib/content/year";
import {
  isSplit,
  itemBlocksWithKeys,
  itemKey,
  itemTitle,
  masteryInfo,
  minutesOf,
  orderRule,
  routineItem,
  usualDayMinutes,
  type MasteryInfo,
} from "@/lib/domain/course";
import { addDays, weekStart } from "@/lib/domain/dates";
import { gradeLabel } from "@/lib/domain/grades";
import { PAUSES_PER_TERM, pausesUsed, streakLength } from "@/lib/domain/streak";
import type { ChildRecords, Child, HouseholdContext } from "./state";
import { printKey } from "./state";
import { liveCourses, type LiveCourse } from "./views";

/*
 * The Teaching screen's view: what each card says and which actions it
 * offers, ported from the prototype's teaching logic.
 */

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX"];
export const roman = (n: number) => ROMAN[n - 1] ?? String(n);

/** What the term-check form needs (serializable, for the client form). */
export type GateSpec = {
  grade: number;
  courseId: string;
  term: number;
  title: string;
  rule: string;
  info: MasteryInfo;
  reviewLabel: string;
  gradeLabel: string;
};

export type Lane = "d" | "q";

export type CardAction =
  | { kind: "record"; input: { grade: number; courseId: string; week: number; track: WeekItem["track"]; key: string } }
  | { kind: "clear"; courseId: string; lane: Lane }
  | { kind: "review"; grade: number; courseId: string }
  | { kind: "gate"; gate: GateSpec };

export type TeachingCard = {
  id: string;
  numeral: string;
  courseId: string;
  week: number;
  course: string;
  /** The card's heading without the course name. */
  item: string;
  pos: string;
  dots: boolean[];
  split: boolean;
  splitNote: string;
  compact: boolean;
  // Full cards
  mins: string;
  kicker: string;
  sourceLabel: string;
  blocks: Block[];
  does: string;
  order: string;
  record?: Extract<CardAction, { kind: "record" }>["input"];
  // Compact cards
  done: boolean;
  line: string;
  nextLine: string;
  next?: { label: string; action: Exclude<CardAction, { kind: "record" }> };
  undo?: { courseId: string; lane: Lane };
  /** Answers printed on the separate parent sheet. */
  answers: string[];
};

export type StreakInfo = {
  label: string;
  sub: string;
  paused: boolean;
  canMark: boolean;
  canPause: boolean;
  pauseNote: string;
};

export type ScreenTeaching = {
  dailyHead: string;
  daily: TeachingCard[];
  week: TeachingCard[];
  streak: StreakInfo;
  weekLabel: string;
  weekSub: string;
  recorded: number;
  total: number;
};

function lanePos(e: LiveCourse["e"], wk: Week | null): string {
  if (e.reviewTerm) return "Review week";
  return `Term ${termOfWeek(Math.min(e.pos, 36))} · Week ${Math.min(e.pos, 36)}${wk?.title ? ` — ${wk.title}` : ""}`;
}

export function gateSpec(course: Course, grade: number, term: number): GateSpec {
  const info = masteryInfo(course, term);
  return {
    grade,
    courseId: course.id,
    term,
    title: `Term ${term} check`,
    rule: info.text || "This course has no scored check. Confirm that the term’s last week and its review are done.",
    info,
    reviewLabel: course.id === "virtue" ? "The honest conversation is done" : "The review week’s work is done",
    gradeLabel: gradeLabel(grade),
  };
}

export function doneKeys(records: ChildRecords["records"], grade: number, courseId: string, week: number): Set<string> {
  return new Set(
    records.filter((r) => r.grade === grade && r.courseId === courseId && r.week === week).map((r) => r.track[0] + r.itemKey),
  );
}

export function screenTeaching(child: Child, ctx: HouseholdContext, rec: ChildRecords): ScreenTeaching {
  const daily: Omit<TeachingCard, "numeral">[] = [];
  const week: Omit<TeachingCard, "numeral">[] = [];
  const live = liveCourses(child).filter(({ e }) => e.pos <= 36);

  for (const { e, course } of live) {
    const w = e.pos;
    const wk = getWeek(course, w);
    if (!wk) continue;
    const T = termOfWeek(w);
    const done = doneKeys(rec.records, e.grade, course.id, w);
    const isDone = (i: WeekItem) => done.has(itemKey(i));
    const allDone = wk.items.every(isDone);
    const nRec = wk.items.filter(isDone).length;
    const groups = [wk.items.filter((i) => i.track === "daily"), wk.items.filter((i) => i.track !== "daily")].filter((g) => g.length);
    const split = isSplit(course);

    groups.forEach((g, gi) => {
      const isDailyG = g[0].track === "daily";
      const lane: Lane = isDailyG ? "d" : "q";
      const te = rec.entries.find((t) => t.courseId === course.id && t.lane === lane && !t.cleared);
      const next = g.find((i) => !isDone(i));
      const lastGroup = gi === groups.length - 1;
      const other = isDailyG ? "weekly tasks" : "daily lessons";
      const mine = isDailyG ? "daily lessons" : "tasks";
      const gatePending = allDone && isGateWeek(w);
      const gate = gateSpec(course, e.grade, T);
      const base: Omit<TeachingCard, "numeral"> = {
        id: `${course.id}:${lane}`,
        courseId: course.id,
        week: w,
        course: course.course,
        item: "This week",
        pos: lanePos(e, wk),
        dots: wk.items.map(isDone),
        split,
        splitNote: isDailyG ? "Daily drill here · weekly lesson below" : "Weekly lesson here · daily drill above",
        compact: true,
        mins: "",
        kicker: "",
        sourceLabel: "",
        blocks: [],
        does: "",
        order: orderRule(course),
        done: false,
        line: "",
        nextLine: "",
        answers: [],
      };
      const titled = (it: Pick<WeekItem, "track" | "key" | "label">) => `${it.track === "queue" ? "Task " : ""}${itemTitle(it)}`;
      let card: Omit<TeachingCard, "numeral"> | null = null;

      if (e.reviewTerm) {
        if (!lastGroup) return;
        card = {
          ...base,
          item: "Review week",
          line: `The Term ${e.reviewTerm} check was below mastery, so Term ${e.reviewTerm + 1} waits for a review week.`,
          nextLine: `Go back over the Term ${e.reviewTerm} review lesson, drill what slipped, then rework the check.`,
          next: { label: "Review week done", action: { kind: "review", grade: e.grade, courseId: course.id } },
        };
      } else if (te) {
        const moved = w !== te.week;
        const prevWeek = getWeek(course, te.week);
        const teItem = prevWeek?.items.find((i) => i.track === te.track && i.key === te.itemKey);
        card = {
          ...base,
          item: teItem ? titled(teItem) : "This week",
          done: true,
          line:
            te.outcome === "well"
              ? `Recorded · went well.${te.advanced ? ` Week ${te.week} is finished.` : ""}`
              : "Recorded · needs another day. It stays first in line.",
          undo: e.pos === (te.advanced ? te.prevPos + 1 : te.prevPos) ? { courseId: course.id, lane } : undefined,
        };
        if (next) {
          card.nextLine = `Next: ${moved ? `Week ${w}, ` : ""}${titled(next)}. Or leave it for tomorrow.`;
          card.next = {
            label: moved ? `Start Week ${w} now` : te.outcome === "again" ? "Try it again now" : "Keep going",
            action: { kind: "clear", courseId: course.id, lane },
          };
        } else if (gatePending) {
          if (lastGroup) {
            card.nextLine = `The Term ${T} check is next.`;
            card.next = { label: "Record the term check", action: { kind: "gate", gate } };
          } else card.nextLine = `The Term ${T} check comes after the ${other}.`;
        } else {
          card.nextLine = `All of this week’s ${mine} are recorded. Week ${w + 1} starts once the ${other} are done.`;
        }
      } else if (next) {
        const r = routineItem(course, next);
        const withIntro = next === g[0] && (isDailyG || groups.length === 1);
        const followUp: Block[] =
          e.followUpWeek === w && e.followUpText && next === g[0] ? [{ kind: "p", text: e.followUpText }] : [];
        card = {
          ...base,
          compact: false,
          item: titled(next),
          mins: r?.time ?? "",
          kicker: `Term ${T} · Week ${w}${wk.title ? ` — ${wk.title}` : ""} · ${nRec} of ${wk.items.length} recorded this week`,
          sourceLabel: `From the Term ${T} manual`,
          blocks: [...followUp, ...(withIntro ? wk.intro : []), ...itemBlocksWithKeys(course, next)],
          does: r?.what ?? "",
          answers: next.answers,
          record: { grade: e.grade, courseId: course.id, week: w, track: next.track, key: next.key },
        };
      } else if (gatePending) {
        card = lastGroup
          ? {
              ...base,
              item: `Term ${T} check`,
              line: `Week ${w} is finished.`,
              nextLine: gate.rule,
              next: { label: "Record the term check", action: { kind: "gate", gate } },
            }
          : { ...base, line: `All of this week’s ${mine} are recorded.`, nextLine: `The Term ${T} check comes after the ${other}.` };
      } else {
        card = { ...base, line: `All of this week’s ${mine} are recorded.`, nextLine: `Week ${w + 1} starts once the ${other} are done.` };
      }
      (isDailyG ? daily : week).push(card);
    });
  }

  let n = 0;
  const number = (c: Omit<TeachingCard, "numeral">): TeachingCard => ({ ...c, numeral: roman(++n) });
  const dailyCards = daily.map(number);
  const weekCards = week.map(number);

  // Daily core length, from each card's routine time.
  const dMins = dailyCards.reduce((a, c) => {
    const course = live.find((l) => l.course.id === c.courseId)!.course;
    return a + minutesOf(c.mins || routineItem(course, { track: "daily", key: "1" })?.time);
  }, 0);

  // Streak.
  const { today, calendar: cal } = ctx;
  const todayStatus = rec.streak.get(today);
  const todayDone = todayStatus === "done";
  const todayMark = todayStatus === "sick" || todayStatus === "travel" ? todayStatus : null;
  const prior = new Map(rec.streak);
  prior.delete(today);
  const streakN = streakLength(prior, cal, today, todayDone);
  const tType = cal.dayType(today);
  const off = tType === "holiday" || tType === "break";
  const offName = tType === "holiday" ? cal.holidays.get(today) : tType === "break" ? cal.breakAt(today)?.label : "";
  const pausesLeft = Math.max(0, PAUSES_PER_TERM - pausesUsed(rec.streak, cal, today));

  // Week counter: weekly work recorded since Monday.
  const monday = weekStart(today);
  const sunday = addDays(monday, 6);
  const weekIds = [...new Set(weekCards.map((c) => c.courseId))];
  const weekTotal = weekIds.reduce((a, id) => {
    const c = live.find((l) => l.course.id === id)!.course;
    return a + c.tracks.filter((t) => t.track !== "daily").reduce((b, t) => b + t.perWeek, 0);
  }, 0);
  const weekDone = rec.records.filter((r) => r.track !== "daily" && r.doneOn >= monday && r.doneOn <= sunday).length;

  const all = [...dailyCards, ...weekCards];
  return {
    dailyHead: `Every day · about ${Math.round(dMins / 5) * 5 || 40} minutes`,
    daily: dailyCards,
    week: weekCards,
    streak: {
      label: `${streakN} ${streakN === 1 ? "school day" : "school days"} in a row`,
      sub: todayDone
        ? off
          ? "Done on a day off. It counts toward the streak."
          : "Today’s daily core is done."
        : off
          ? `Today is ${offName}. The streak is safe whether you teach or rest.`
          : todayMark
            ? `Today is a ${todayMark} day. The streak is paused, not broken.`
            : "Today counts once every daily course is recorded.",
      paused: !!todayMark && !todayDone,
      canMark: !todayMark && !todayDone && !off,
      canPause: pausesLeft > 0,
      pauseNote: `${pausesLeft} of ${PAUSES_PER_TERM} pause days left this term`,
    },
    weekLabel: `${Math.min(weekDone, weekTotal)} of ${weekTotal} done this week`,
    weekSub:
      weekDone > weekTotal
        ? `${weekDone - weekTotal} ahead. Nicely done.`
        : weekDone === weekTotal
          ? "The week’s work is finished."
          : "No due dates within the week. Anything not done rolls into next week.",
    recorded: all.filter((c) => c.done).length,
    total: all.length,
  };
}

// ---------------------------------------------------------------------------
// Paper mode

export type PrintDoc = { grade: number; courseId: string; doc: string };

export type CheckinRow = {
  courseId: string;
  grade: number;
  name: string;
  pos: string;
  printNote: string;
  printLabel: string;
  printDoc: PrintDoc | null;
  state: "week" | "review" | "gate" | "complete";
  week: number;
  gate: GateSpec | null;
};

export type PrintGroup = { label: string; sub: string; next: boolean; docs: PrintDoc[]; printLabel: string; status: string };

export function paperTeaching(child: Child, rec: ChildRecords): { rows: CheckinRow[]; queue: PrintGroup[] } {
  const live = liveCourses(child);
  const rows: CheckinRow[] = live.map(({ e, course }) => {
    const finished = e.pos > 36;
    const w = Math.min(e.pos, 36);
    const T = termOfWeek(w);
    const wk = getWeek(course, w);
    const rv = e.reviewTerm;
    const doc = rv ? `r${rv}` : `t${T}`;
    const printed = rec.printed.has(printKey(e.grade, course.id, doc));
    const name = rv ? "Review-week sheets" : `Term ${T} manual`;
    const follow = e.followUpWeek === w && e.followUpText ? `. ${e.followUpText}` : "";
    return {
      courseId: course.id,
      grade: e.grade,
      name: course.course,
      pos:
        (finished ? `${gradeLabel(e.grade)} finished` : rv ? `Review week before Term ${rv + 1}` : `Term ${T} · Week ${w}${wk?.title ? ` — ${wk.title}` : ""}`) +
        follow,
      printNote: finished ? "" : `${name}${printed ? " printed" : " not printed yet"}`,
      printLabel: printed ? "Print again" : "Print",
      printDoc: finished ? null : { grade: e.grade, courseId: course.id, doc },
      state: finished ? "complete" : rv ? "review" : isGateWeek(w) ? "gate" : "week",
      week: w,
      gate: !finished && !rv && isGateWeek(w) ? gateSpec(course, e.grade, T) : null,
    };
  });

  const key = (e: LiveCourse["e"], doc: string) => rec.printed.has(printKey(e.grade, e.courseId, doc));
  const curT = (e: LiveCourse["e"]) => termOfWeek(Math.min(e.pos, 36));
  const going = live.filter(({ e }) => e.pos <= 36);
  const plans = live.filter(({ e }) => !key(e, "plan"));
  const manuals = going.filter(({ e }) => !e.reviewTerm && !key(e, `t${curT(e)}`));
  const reviews = going.filter(({ e }) => e.reviewTerm && !key(e, `r${e.reviewTerm}`));
  const doc = (e: LiveCourse["e"], d: string): PrintDoc => ({ grade: e.grade, courseId: e.courseId, doc: d });
  const groups = [
    {
      label: "Year plans",
      need: plans.length,
      sub: plans.length ? `${plans.length} of ${live.length} not printed. Read once at the start of the year.` : `All ${live.length} printed.`,
      docs: (plans.length ? plans : live).map(({ e }) => doc(e, "plan")),
    },
    ...(reviews.length
      ? [{ label: "Review-week sheets", need: reviews.length, sub: reviews.map((x) => x.course.course).join(", "), docs: reviews.map(({ e }) => doc(e, `r${e.reviewTerm}`)) }]
      : []),
    {
      label: `Term manuals, where ${child.name} is now`,
      need: manuals.length,
      sub: manuals.length ? manuals.map((x) => x.course.course).join(", ") : "Every current manual is printed.",
      docs: (manuals.length ? manuals : going.filter(({ e }) => !e.reviewTerm)).map(({ e }) => doc(e, `t${curT(e)}`)),
    },
  ];
  let nextSet = false;
  const queue = groups.map((g) => {
    const next = !nextSet && g.need > 0;
    if (next) nextSet = true;
    return { label: g.label, sub: g.sub, next, docs: g.docs, printLabel: g.need ? `Print ${g.need}` : "Print all again", status: g.need ? "" : "Printed" };
  });
  return { rows, queue };
}

/** A usual day's routine minutes from the booklets (paper mode). */
export function paperUsualMinutes(child: Child): number {
  return Math.round(liveCourses(child).filter(({ e }) => e.pos <= 36).reduce((a, { course }) => a + usualDayMinutes(course), 0));
}

/** This week's recitation pieces, from the Memory Work course's week intro. */
export function recitationThisWeek(child: Child): string | null {
  const mem = liveCourses(child).find((l) => l.course.id === "memory");
  if (!mem) return null;
  const wk = getWeek(mem.course, Math.min(mem.e.pos, 36));
  for (const b of wk?.intro ?? []) {
    if (b.kind !== "table") continue;
    for (const r of [b.head, ...b.rows]) if (/^recitation/i.test(r[0] ?? "")) return r[1] ?? null;
  }
  return null;
}
