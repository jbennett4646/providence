import { z } from "zod";

/*
 * The course content schema, as delivered in the design handoff (`Grade N/*.json`).
 * The schemas are strict so a content file with an unexpected field fails
 * validation instead of being silently dropped.
 */

export const paragraphBlock = z.object({ kind: z.literal("p"), text: z.string() }).strict();

export const tableBlock = z
  .object({
    kind: z.literal("table"),
    head: z.array(z.string()),
    rows: z.array(z.array(z.string())),
  })
  .strict();

/** A checklist line (the parent ticks it off). */
export const checkBlock = z.object({ kind: z.literal("check"), text: z.string() }).strict();

/** An answer key, shown only when answer keys are on. */
export const answersBlock = z.object({ kind: z.literal("answers"), text: z.string() }).strict();

export const block = z.discriminatedUnion("kind", [paragraphBlock, tableBlock, checkBlock, answersBlock]);

export const subsection = z.object({ title: z.string(), blocks: z.array(block) }).strict();

export const section = z
  .object({ title: z.string(), blocks: z.array(block), subs: z.array(subsection) })
  .strict();

/** `daily` is the Daily core, `queue` the Weekly queue; `weekly` is a single weekly item (Virtue Formation). */
export const trackKind = z.enum(["daily", "queue", "weekly"]);

export const trackItem = z
  .object({ key: z.string(), label: z.string(), what: z.string(), time: z.string() })
  .strict();

export const track = z
  .object({
    track: trackKind,
    label: z.string(),
    perWeek: z.number().int().positive(),
    items: z.array(trackItem),
  })
  .strict();

export const weekItem = z
  .object({
    track: trackKind,
    key: z.string(),
    label: z.string(),
    blocks: z.array(block),
    answers: z.array(z.string()),
    /** The item's script is the routine itself (the track item's `what`), not separate content. */
    fromRoutine: z.boolean().optional(),
  })
  .strict();

export const week = z
  .object({
    week: z.number().int().min(1).max(36),
    title: z.string(),
    intro: z.array(block),
    items: z.array(weekItem),
  })
  .strict();

export const checkPart = z
  .object({ label: z.string(), of: z.number().int().positive(), std: z.number().int().nonnegative() })
  .strict();

/** A structured term check, scored in parts (History & Geography). */
export const termCheck = z
  .object({
    parts: z.array(checkPart),
    of: z.number().int().positive(),
    std: z.number().int().nonnegative(),
    /** What to do when the check falls below the standard. */
    below: z.string(),
    /** When true, a miss folds into the next term instead of holding it back for a review week. */
    fold: z.boolean(),
  })
  .strict();

export const term = z
  .object({
    term: z.number().int().min(1).max(6),
    title: z.string(),
    weeksRange: z.tuple([z.number().int(), z.number().int()]),
    /** The term check's mastery line, e.g. "Mastery: 16 of 20, plus both chants said perfectly." */
    mastery: z.string().nullable(),
    check: termCheck.optional(),
    glance: z.array(block),
    weeks: z.array(week),
    reference: z.array(section),
    /** Notes for the parent, checklists and answer keys printed after the weeks. */
    after: z.array(section),
  })
  .strict();

export const course = z
  .object({
    id: z.string(),
    course: z.string(),
    dash: z.string(),
    grade: z.number().int().min(0).max(12),
    number: z.string(),
    cadence: z.string(),
    elective: z.boolean().optional(),
    tracks: z.array(track).min(1),
    orderRules: z.array(z.string()),
    plan: z.object({ title: z.string(), sections: z.array(section) }).strict(),
    terms: z.array(term),
  })
  .strict();

export const courseIndexEntry = z
  .object({
    id: z.string(),
    course: z.string(),
    dash: z.string(),
    file: z.string(),
    number: z.string(),
    elective: z.boolean().optional(),
  })
  .strict();

export const courseIndex = z.array(courseIndexEntry);

export type Block = z.infer<typeof block>;
export type Section = z.infer<typeof section>;
export type TrackKind = z.infer<typeof trackKind>;
export type Track = z.infer<typeof track>;
export type WeekItem = z.infer<typeof weekItem>;
export type Week = z.infer<typeof week>;
export type TermCheck = z.infer<typeof termCheck>;
export type Term = z.infer<typeof term>;
export type Course = z.infer<typeof course>;
export type CourseIndexEntry = z.infer<typeof courseIndexEntry>;
