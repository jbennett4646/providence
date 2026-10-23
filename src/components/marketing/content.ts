/*
 * Copy for the public landing page and the locked student module, taken from
 * the prototype's renderVals() (classical voice, "formation" headline).
 */

export const hero = {
  kicker: "Classical · Christian · Kindergarten through Grade Twelve",
  headline: "Education makes a kind of person.",
  body: "Every school forms one, through what it rewards and what it leaves out. We say plainly which: a child who reasons carefully, writes clearly, keeps their word, and can still be moved by a poem. Latin, the four-year history cycle, memory work, the seven virtues. The Greeks had an older name for this.",
  ctaPrimary: "Tour the parent dashboard",
};

export type HeroRow = { subject: string; detail: string; mark: string };

export const heroRows: HeroRow[] = [
  { subject: "Arithmetic", detail: "Term 2 · Week 9", mark: "Grade 5" },
  { subject: "Literature & Read-Alouds", detail: "Term 1 · Week 5", mark: "Grade 5" },
  { subject: "Latin", detail: "Term 6 · Week 33", mark: "Grade 4" },
  { subject: "Science", detail: "Term 4 · Week 19", mark: "Grade 4" },
];

export type Virtue = { numeral: string; name: string; how: string };

export const virtues: Virtue[] = [
  {
    numeral: "I",
    name: "Prudence",
    how: "Logic in the middle years, and the habit of stating an opponent’s case before answering it.",
  },
  {
    numeral: "II",
    name: "Justice",
    how: "History read from sources, so that judgment rests on what people actually did.",
  },
  {
    numeral: "III",
    name: "Fortitude",
    how: "Hard subjects kept hard. Latin declensions and long proofs are not made easier to be kind.",
  },
  {
    numeral: "IV",
    name: "Temperance",
    how: "A fixed daily rhythm, finished work, and an end to the school day that is honoured.",
  },
  {
    numeral: "V",
    name: "Faith",
    how: "Sacred history read whole, in its own words, alongside the tradition that received it.",
  },
  {
    numeral: "VI",
    name: "Hope",
    how: "Memory work — psalms, poems and speeches a child carries out of the house and into adult life.",
  },
  {
    numeral: "VII",
    name: "Charity",
    how: "Recitation and narration to a listener, because the point of clear speech is another person.",
  },
];

export type Pillar = { numeral: string; title: string; body: string };

export const pillars: Pillar[] = [
  {
    numeral: "I",
    title: "Read it first",
    body: "Parents see every lesson, every question and every mark before the child does — and may substitute any text at will.",
  },
  {
    numeral: "II",
    title: "Taught by a parent",
    body: "Kindergarten through Grade 5 is done at a table, on paper, aloud. There is no student login, because a child that age has nothing to gain from one.",
  },
  {
    numeral: "III",
    title: "The paperwork, done",
    body: "Transcripts, portfolios and state reporting assemble themselves, on whatever cadence your state asks for.",
  },
  {
    numeral: "IV",
    title: "Not alone",
    body: "Co-ops, clubs and gatherings within driving distance, organised by the families who actually attend them.",
  },
];

export const transparencyHeadline = "Nothing hidden from the parent.";

export type UnitRow = { n: string; title: string; kind: string };

export const unitRows: UnitRow[] = [
  { n: "i", title: "Reading: Prince Henry and the sea", kind: "Text" },
  { n: "ii", title: "Map work: the Atlantic coast of Africa", kind: "Exercise" },
  { n: "iii", title: "Recitation: the compass rose", kind: "Oral" },
  { n: "iv", title: "Composition: a sailor’s letter home", kind: "Written" },
  { n: "v", title: "Unit examination", kind: "Graded" },
];

export type PacingRow = { name: string; grade: string; lesson: string };

export const pacingRows: PacingRow[] = [
  { name: "Arithmetic", grade: "Grade 5", lesson: "Term 2 · Week 9" },
  { name: "Literature & Read-Alouds", grade: "Grade 5", lesson: "Term 1 · Week 5" },
  { name: "Penmanship", grade: "Grade 5", lesson: "Term 1 · Week 4" },
  { name: "History & Geography", grade: "Grade 4", lesson: "Term 6 · Week 34" },
  { name: "Latin", grade: "Grade 4", lesson: "Term 6 · Week 33" },
  { name: "Science", grade: "Grade 4", lesson: "Term 4 · Week 19" },
];

export type Plan =
  | { live: true; name: string; price: string; blurb: string; items: string[] }
  | { live: false; name: string; blurb: string; items: string[] };

export const plans: Plan[] = [
  {
    live: true,
    name: "Providence Home Academy",
    price: "$100",
    blurb: "The whole platform, for the whole household.",
    items: [
      "Every K–12 course, with year plans and term manuals",
      "Teach on screen or from printed booklets",
      "Per-subject pacing and the floor rule",
      "Attendance, progress reports and transcripts",
      "State reporting on your state's cadence",
    ],
  },
  {
    live: false,
    name: "Academy + Tutoring",
    blurb: "Everything in the household plan, with tutoring credits for one-to-one sessions.",
    items: [
      "Everything in the household plan",
      "A set number of tutoring sessions each month",
      "Use them in any course",
    ],
  },
  {
    live: true,
    name: "Co-op",
    price: "$500",
    blurb: "For homeschool co-ops, churches and parish schools.",
    items: ["Up to 25 households", "Shared lesson planning", "Group reporting"],
  },
];

export type Reserved = { name: string; count: string; note: string };

/** What the student module keeps for a K–5 child until it opens in Grade 6. */
export const reserved: Reserved[] = [
  {
    name: "Memory work",
    count: "6 pieces",
    note: "Passages recited to a parent this term, with the dates they got them clean.",
  },
  {
    name: "Commonplace book",
    count: "31 entries",
    note: "Everything they have copied out by hand since Kindergarten.",
  },
  {
    name: "Course progress",
    count: "6 subjects",
    note: "Where they stand in each subject across the whole cycle.",
  },
  {
    name: "Portfolio",
    count: "24 items",
    note: "Drawings, copywork and recordings, kept as they made them.",
  },
];
