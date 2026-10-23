import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/*
 * Persistent state, replacing the prototype's localStorage key `pa-paper-demo-v2`.
 *
 * Course content itself is static (content/grade-N/*.json). The `courses`
 * table is a catalog of it, imported by `npm run db:seed`, so enrollments and
 * records can reference a real course.
 *
 * Dates are calendar dates in the household's own time ('YYYY-MM-DD').
 */

export const plan = pgEnum("plan", ["household", "parish"]);
export const teachingMode = pgEnum("teaching_mode", ["screen", "paper"]);
export const trackKind = pgEnum("track_kind", ["daily", "queue", "weekly"]);
export const streakStatus = pgEnum("streak_status", ["done", "sick"]);
export const itemOutcome = pgEnum("item_outcome", ["well"]);

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

// ---------------------------------------------------------------------------
// Content catalog

export const courses = pgTable(
  "courses",
  {
    grade: smallint("grade").notNull(),
    id: text("id").notNull(),
    course: text("course").notNull(),
    dash: text("dash").notNull(),
    number: text("number").notNull(),
    file: text("file").notNull(),
    elective: boolean("elective").notNull().default(false),
    /** Display order within the grade (the index.json order). */
    sortOrder: smallint("sort_order").notNull(),
  },
  (t) => [primaryKey({ columns: [t.grade, t.id] })],
);

// ---------------------------------------------------------------------------
// Household

export const households = pgTable("households", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  /** Two-letter state code. Compliance tooling is Georgia-only for now. */
  state: text("state").notNull().default("GA"),
  plan: plan("plan"),
  /** Weekdays taught, 0 = Sunday … 6 = Saturday. Default Monday–Friday. */
  schoolDays: smallint("school_days").array().notNull().default(sql`'{1,2,3,4,5}'::smallint[]`),
  /** First day of the school year; the calendar lays out 36 weeks from it. */
  calStart: date("cal_start"),
  /** Small per-household UI preferences, e.g. { weekNoteSeen: true }. */
  prefs: jsonb("prefs").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: createdAt(),
});

/** Family breaks. The plan shifts around them; break days don't count toward 180. */
export const calendarBreaks = pgTable(
  "calendar_breaks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    from: date("from").notNull(),
    to: date("to").notNull(),
  },
  (t) => [index("calendar_breaks_household_idx").on(t.householdId), check("calendar_breaks_range", sql`${t.from} <= ${t.to}`)],
);

/** Federal holidays the family has chosen to teach on (holidays are off by default). */
export const holidayTeach = pgTable(
  "holiday_teach",
  {
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
  },
  (t) => [primaryKey({ columns: [t.householdId, t.date] })],
);

// ---------------------------------------------------------------------------
// Child

export const children = pgTable(
  "children",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** 0 = Kindergarten … 12. Students get their own login from Grade 6. */
    grade: smallint("grade").notNull(),
    mode: teachingMode("mode").notNull().default("screen"),
    /** School days taught elsewhere this year before joining, so the 180 count is right. */
    priorDays: smallint("prior_days").notNull().default(0),
    sortOrder: smallint("sort_order").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [
    index("children_household_idx").on(t.householdId),
    check("children_grade_range", sql`${t.grade} between 0 and 12`),
    check("children_prior_days", sql`${t.priorDays} >= 0`),
  ],
);

/**
 * A child's place in one course: the prototype's `pos[courseId]`, plus the
 * course's `review` and `followUps` entries. Required courses are enrolled
 * for every child; electives are enrolled when switched on and kept (with
 * their position) when switched off.
 */
export const enrollments = pgTable(
  "enrollments",
  {
    childId: uuid("child_id")
      .notNull()
      .references(() => children.id, { onDelete: "cascade" }),
    grade: smallint("grade").notNull(),
    courseId: text("course_id").notNull(),
    /** Current week, 1–36; 37 means the grade is finished in this course. */
    pos: smallint("pos").notNull().default(1),
    /** Electives only: whether the course is switched on for this child. */
    active: boolean("active").notNull().default(true),
    /** After a missed term check: the term whose review week is due before moving on. */
    reviewTerm: smallint("review_term"),
    /** A note carried into a later week, e.g. from a term check that folds forward. */
    followUpWeek: smallint("follow_up_week"),
    followUpText: text("follow_up_text"),
  },
  (t) => [
    primaryKey({ columns: [t.childId, t.grade, t.courseId] }),
    foreignKey({ columns: [t.grade, t.courseId], foreignColumns: [courses.grade, courses.id] }),
    check("enrollments_pos_range", sql`${t.pos} between 1 and 37`),
    check("enrollments_review_term", sql`${t.reviewTerm} is null or ${t.reviewTerm} between 1 and 6`),
  ],
);

/** Term checks: the prototype's `gates[courseId][term] = { score, of, pass }`. */
export const gates = pgTable(
  "gates",
  {
    childId: uuid("child_id")
      .notNull()
      .references(() => children.id, { onDelete: "cascade" }),
    grade: smallint("grade").notNull(),
    courseId: text("course_id").notNull(),
    term: smallint("term").notNull(),
    /** Null for a course with no scored check (the parent confirms the term's work instead). */
    score: integer("score"),
    of: integer("of"),
    pass: boolean("pass").notNull(),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.childId, t.grade, t.courseId, t.term] }),
    foreignKey({ columns: [t.grade, t.courseId], foreignColumns: [courses.grade, courses.id] }),
    check("gates_term_range", sql`${t.term} between 1 and 6`),
  ],
);

/**
 * One lesson item marked done: the prototype's `rec[courseId:week][itemKey]`.
 * Queue items done in a calendar week give the week counter (`weekDone`).
 */
export const itemRecords = pgTable(
  "item_records",
  {
    childId: uuid("child_id")
      .notNull()
      .references(() => children.id, { onDelete: "cascade" }),
    grade: smallint("grade").notNull(),
    courseId: text("course_id").notNull(),
    week: smallint("week").notNull(),
    track: trackKind("track").notNull(),
    itemKey: text("item_key").notNull(),
    outcome: itemOutcome("outcome").notNull().default("well"),
    /** The school day it was done on. */
    doneOn: date("done_on").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.childId, t.grade, t.courseId, t.week, t.track, t.itemKey] }),
    foreignKey({ columns: [t.grade, t.courseId], foreignColumns: [courses.grade, courses.id] }),
    index("item_records_child_done_idx").on(t.childId, t.doneOn),
    check("item_records_week_range", sql`${t.week} between 1 and 36`),
  ],
);

export type ExtraActivity = { label: string; mins: number };

/** A school day logged: the prototype's `att[date] = { routine, extra[] }`. */
export const attendanceDays = pgTable(
  "attendance_days",
  {
    childId: uuid("child_id")
      .notNull()
      .references(() => children.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    /** Minutes of the routine lessons. */
    routineMins: integer("routine_mins").notNull().default(0),
    /** Other instruction that counts toward the day, e.g. { label: 'Free active play', mins: 60 }. */
    extra: jsonb("extra").$type<ExtraActivity[]>().notNull().default([]),
  },
  (t) => [primaryKey({ columns: [t.childId, t.date] }), check("attendance_routine_mins", sql`${t.routineMins} >= 0`)],
);

/** Daily-practice streak: the prototype's `streak[date] = 'done' | 'sick'`. */
export const streakDays = pgTable(
  "streak_days",
  {
    childId: uuid("child_id")
      .notNull()
      .references(() => children.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    status: streakStatus("status").notNull(),
  },
  (t) => [primaryKey({ columns: [t.childId, t.date] })],
);

/** Paper mode's weekly check-in log ("Week done", "Carried over", term checks). */
export const checkins = pgTable(
  "checkins",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    childId: uuid("child_id")
      .notNull()
      .references(() => children.id, { onDelete: "cascade" }),
    grade: smallint("grade").notNull(),
    courseId: text("course_id").notNull(),
    /** What was checked in, e.g. 'Latin I · Week 8' or 'Latin I · Term 1 check'. */
    label: text("label").notNull(),
    /** e.g. 'Done', 'Carried over', 'Finished', '18 of 20 · mastery'. */
    result: text("result").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index("checkins_child_idx").on(t.childId, t.createdAt),
    foreignKey({ columns: [t.grade, t.courseId], foreignColumns: [courses.grade, courses.id] }),
  ],
);

/**
 * Printed booklets: the prototype's `printed['courseId:plan' | 'courseId:tN' | 'courseId:rN']`.
 * `doc` is 'plan', 't1'…'t6' (term manuals) or 'r1'…'r5' (review-week sheets).
 */
export const printedDocs = pgTable(
  "printed_docs",
  {
    childId: uuid("child_id")
      .notNull()
      .references(() => children.id, { onDelete: "cascade" }),
    grade: smallint("grade").notNull(),
    courseId: text("course_id").notNull(),
    doc: text("doc").notNull(),
    printedAt: timestamp("printed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.childId, t.grade, t.courseId, t.doc] }),
    foreignKey({ columns: [t.grade, t.courseId], foreignColumns: [courses.grade, courses.id] }),
    check("printed_docs_doc", sql`${t.doc} ~ '^(plan|t[1-6]|r[1-5])$'`),
  ],
);

// ---------------------------------------------------------------------------
// Relations

export const householdsRelations = relations(households, ({ many }) => ({
  children: many(children),
  breaks: many(calendarBreaks),
  holidayTeach: many(holidayTeach),
}));

export const childrenRelations = relations(children, ({ one, many }) => ({
  household: one(households, { fields: [children.householdId], references: [households.id] }),
  enrollments: many(enrollments),
  gates: many(gates),
  itemRecords: many(itemRecords),
  attendance: many(attendanceDays),
  streak: many(streakDays),
  checkins: many(checkins),
  printed: many(printedDocs),
}));

export const calendarBreaksRelations = relations(calendarBreaks, ({ one }) => ({
  household: one(households, { fields: [calendarBreaks.householdId], references: [households.id] }),
}));

export const holidayTeachRelations = relations(holidayTeach, ({ one }) => ({
  household: one(households, { fields: [holidayTeach.householdId], references: [households.id] }),
}));

export const enrollmentsRelations = relations(enrollments, ({ one }) => ({
  child: one(children, { fields: [enrollments.childId], references: [children.id] }),
}));

export const gatesRelations = relations(gates, ({ one }) => ({
  child: one(children, { fields: [gates.childId], references: [children.id] }),
}));

export const itemRecordsRelations = relations(itemRecords, ({ one }) => ({
  child: one(children, { fields: [itemRecords.childId], references: [children.id] }),
}));

export const attendanceDaysRelations = relations(attendanceDays, ({ one }) => ({
  child: one(children, { fields: [attendanceDays.childId], references: [children.id] }),
}));

export const streakDaysRelations = relations(streakDays, ({ one }) => ({
  child: one(children, { fields: [streakDays.childId], references: [children.id] }),
}));

export const checkinsRelations = relations(checkins, ({ one }) => ({
  child: one(children, { fields: [checkins.childId], references: [children.id] }),
}));

export const printedDocsRelations = relations(printedDocs, ({ one }) => ({
  child: one(children, { fields: [printedDocs.childId], references: [children.id] }),
}));
