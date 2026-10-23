import type { Block, Course, Track, Week, WeekItem } from "@/lib/content/schema";
import { termOfWeek } from "@/lib/content/year";

/*
 * Helpers over one course's content, ported from the prototype's logic.
 */

/** A course with a daily core and a weekly track (e.g. Latin I, Arithmetic). */
export function isSplit(course: Course): boolean {
  return course.tracks.some((t) => t.track === "daily") && course.tracks.some((t) => t.track !== "daily");
}

export function trackOf(course: Course, track: WeekItem["track"]): Track | undefined {
  return course.tracks.find((t) => t.track === track);
}

/** The routine entry (label, time, what the child does) behind a week's item. */
export function routineItem(course: Course, item: Pick<WeekItem, "track" | "key">) {
  const t = trackOf(course, item.track);
  return t ? (t.items.find((r) => r.key === item.key) ?? t.items[0]) : undefined;
}

/** "Day 3 · Write", "A · Lesson", or the label alone for a weekly item. */
export function itemTitle(item: Pick<WeekItem, "track" | "key" | "label">): string {
  if (item.track === "daily") return `Day ${item.key} · ${item.label}`;
  if (item.track === "queue") return `${item.key} · ${item.label}`;
  return item.label;
}

/** A stable key for an item within its week: track initial + key, e.g. "d3", "qA". */
export function itemKey(item: Pick<WeekItem, "track" | "key">): string {
  return item.track[0] + item.key;
}

/** The item's script; an item with no blocks of its own uses the routine's description. */
export function itemBlocks(course: Course, item: WeekItem): Block[] {
  if (item.blocks.length) return item.blocks;
  const r = routineItem(course, item);
  return r ? [{ kind: "p", text: r.what }] : [];
}

/** The item's script followed by its answer keys. */
export function itemBlocksWithKeys(course: Course, item: WeekItem): Block[] {
  return [...itemBlocks(course, item), ...item.answers.map((text) => ({ kind: "answers" as const, text }))];
}

/** Weekly-queue keys the manual leaves out of a week. */
export function missingQueueKeys(course: Course, week: Week): string[] {
  const q = trackOf(course, "queue");
  if (!q) return [];
  return q.items.map((x) => x.key).filter((k) => !week.items.some((i) => i.track === "queue" && i.key === k));
}

/** The course's ordering rule for the week, if it states one. */
export function orderRule(course: Course): string {
  return course.orderRules.find((r) => /order|before|after|sitting/i.test(r)) ?? "";
}

/** A daily core simple enough to print as one table: one short paragraph per day, no answers. */
export function isDailySimple(course: Course, daily: WeekItem[]): boolean {
  return (
    daily.length > 0 &&
    daily.every((i) => {
      const b = itemBlocks(course, i);
      return b.length <= 1 && !i.answers.length && b.every((x) => x.kind === "p");
    })
  );
}

/** Minutes from a routine time like "15 min" or "10–15 min" (the midpoint). */
export function minutesOf(time: string | undefined): number {
  const m = /(\d+)(?:\s*[–-]\s*(\d+))?\s*min/.exec(time ?? "");
  return m ? Math.round((Number(m[1]) + Number(m[2] ?? m[1])) / 2) : 0;
}

/** Minutes of a course's whole weekly routine, divided over five days: a usual day's share. */
export function usualDayMinutes(course: Course): number {
  return course.tracks.reduce((a, t) => a + t.items.reduce((b, it) => b + minutesOf(it.time), 0), 0) / 5;
}

export type MasteryInfo = {
  /** The mastery line as written, or "" for a course without one. */
  text: string;
  /** Whether the check has a score ("16 of 20"). */
  scored: boolean;
  /** Score needed. */
  threshold: number;
  of: number;
  /** The line also asks for the chants said perfectly. */
  chants: boolean;
  /** A check scored in parts, each with its own standard. */
  parts: { label: string; of: number; std: number }[] | null;
  /** A miss folds into the next term instead of holding it back. */
  fold: boolean;
  /** What to do when the check falls below the standard. */
  below: string;
};

export function masteryInfo(course: Course, term: number): MasteryInfo {
  const t = course.terms[term - 1];
  const text = t?.mastery ?? "";
  const m = /(\d+) of (\d+)/.exec(text);
  const ck = t?.check ?? null;
  return {
    text,
    scored: !!m || !!ck,
    threshold: ck ? ck.std : m ? Number(m[1]) : 0,
    of: ck ? ck.of : m ? Number(m[2]) : 0,
    chants: /chant/i.test(text),
    parts: ck ? ck.parts : null,
    fold: !!ck?.fold,
    below: ck?.below ?? "",
  };
}

export type GateInput = { score?: number; parts?: number[]; chants?: boolean };

/** Whether a term check meets its mastery line. Unscored checks always pass. */
export function gatePasses(info: MasteryInfo, input: GateInput): boolean {
  if (info.parts) {
    const parts = input.parts ?? [];
    return info.parts.every((p, i) => (parts[i] ?? 0) >= p.std);
  }
  if (!info.scored) return true;
  return (input.score ?? 0) >= info.threshold && (!info.chants || !!input.chants);
}

/** The total score of a check (the sum of its parts when scored in parts). */
export function gateTotal(info: MasteryInfo, input: GateInput): number | null {
  if (info.parts) return (input.parts ?? []).reduce((a, b) => a + b, 0);
  return info.scored ? (input.score ?? 0) : null;
}

/** A course's content for one week, without touching the file loader (safe in the browser). */
export function weekOf(course: Course, week: number): Week | null {
  for (const t of course.terms) {
    const w = t.weeks.find((x) => x.week === week);
    if (w) return w;
  }
  return null;
}

/** The first sentence of a mastery line, for short displays. */
export function firstSentence(text: string): string {
  const m = /^.*?[.!?](\s|$)/.exec(text);
  return (m ? m[0] : text).trim();
}

/** "Term 2 · Week 9" */
export function posLabel(week: number): string {
  return `Term ${termOfWeek(week)} · Week ${week}`;
}

/** Progress through the year as a percentage of weeks finished. */
export function weekPct(pos: number): number {
  return Math.round(((Math.min(pos, 37) - 1) / 36) * 100);
}
