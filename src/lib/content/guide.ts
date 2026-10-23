import { readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";

/*
 * Grade guides: long-form documents for the parent that sit beside the
 * courses (e.g. the Grade 3 test readiness guide). Text uses **bold** and
 * *italic* markers. Stored in content/grade-N/guides/<id>.json.
 */

const text = z.string();
const option4 = z.array(text).length(4);

export const guideBlock = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("p"), text }).strict(),
  z.object({ kind: z.literal("list"), items: z.array(text) }).strict(),
  z.object({ kind: z.literal("steps"), items: z.array(text) }).strict(),
  z.object({ kind: z.literal("quote"), text }).strict(),
  z.object({ kind: z.literal("facts"), rows: z.array(z.tuple([text, text])) }).strict(),
  z.object({ kind: z.literal("table"), head: z.array(text), rows: z.array(z.array(text)) }).strict(),
  z
    .object({
      kind: z.literal("plan"),
      head: z.array(text),
      days: z.array(
        z.object({ day: z.number().int(), week34: z.object({ title: text, text }).strict(), week35: z.object({ title: text, text }).strict() }).strict(),
      ),
    })
    .strict(),
  z
    .object({
      kind: z.literal("group"),
      title: text,
      intro: text.nullable(),
      passage: z.object({ title: text, text }).strict().nullable(),
      questions: z.array(z.object({ n: z.number().int(), q: text, options: option4 }).strict()),
    })
    .strict(),
  z.object({ kind: z.literal("answersheet"), count: z.number().int().positive() }).strict(),
  z.object({ kind: z.literal("key"), rows: z.array(z.tuple([text, text])), answers: z.record(z.string(), z.enum(["A", "B", "C", "D"])) }).strict(),
]);

export const guide = z
  .object({
    title: text,
    subtitle: text,
    sections: z.array(z.object({ id: z.string(), title: text, blocks: z.array(guideBlock) }).strict()),
  })
  .strict();

export type Guide = z.infer<typeof guide>;
export type GuideBlock = z.infer<typeof guideBlock>;
export type PlanDay = Extract<GuideBlock, { kind: "plan" }>["days"][number];

const cache = new Map<string, Guide>();

/** A grade guide by id, or null if there is none. */
export function getGuide(grade: number, id: string): Guide | null {
  if (!/^[a-z0-9-]+$/.test(id)) return null;
  const key = `${grade}:${id}`;
  const hit = cache.get(key);
  if (hit) return hit;
  let raw: string;
  try {
    raw = readFileSync(path.join(process.cwd(), "content", `grade-${grade}`, "guides", `${id}.json`), "utf8");
  } catch {
    return null;
  }
  const g = guide.parse(JSON.parse(raw));
  cache.set(key, g);
  return g;
}

/** The guides published for a grade (id and title), for links. */
export const GUIDES: Record<number, { id: string; title: string }[]> = {
  3: [{ id: "test-readiness", title: "Test readiness" }],
};

/** The two-week plan's days (weeks 34 and 35) from a readiness guide. */
export function readinessPlan(g: Guide): PlanDay[] {
  for (const s of g.sections) for (const b of s.blocks) if (b.kind === "plan") return b.days;
  return [];
}
