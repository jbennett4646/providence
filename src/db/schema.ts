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
  type AnyPgColumn,
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
export const streakStatus = pgEnum("streak_status", ["done", "sick", "travel"]);
export const itemOutcome = pgEnum("item_outcome", ["well"]);
export const userRole = pgEnum("user_role", ["parent", "student"]);

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
  /** IANA time zone the household's "today" is reckoned in. */
  timezone: text("timezone").notNull().default("America/New_York"),
  /** Small per-household UI preferences, e.g. { weekNoteSeen: true }. */
  prefs: jsonb("prefs").$type<Record<string, unknown>>().notNull().default({}),
  /** Set when sign-up's onboarding steps are finished. */
  onboardedAt: timestamp("onboarded_at", { withTimezone: true }),
  // For the state forms (Declaration of Intent): the instructing parent and where home study happens.
  parentName: text("parent_name"),
  addressLine1: text("address_line1"),
  addressLine2: text("address_line2"),
  city: text("city"),
  county: text("county"),
  postalCode: text("postal_code"),
  phone: text("phone"),
  // Billing (Stripe). One subscription covers the whole household.
  stripeCustomerId: text("stripe_customer_id").unique(),
  subscriptionId: text("subscription_id").unique(),
  /** Stripe's subscription status: active, trialing, past_due, canceled, … */
  subscriptionStatus: text("subscription_status"),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  /** A parish or co-op whose plan covers this household. */
  coopId: uuid("coop_id").references((): AnyPgColumn => coops.id, { onDelete: "set null" }),
  createdAt: createdAt(),
});

/**
 * A parish, neighbourhood or co-op on the parish plan. The owning household
 * holds the subscription; up to `maxHouseholds` families join with the
 * invite code and are covered by it.
 */
export const coops = pgTable("coops", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  ownerHouseholdId: uuid("owner_household_id")
    .notNull()
    .unique()
    .references((): AnyPgColumn => households.id, { onDelete: "cascade" }),
  inviteCode: text("invite_code").notNull().unique(),
  maxHouseholds: smallint("max_households").notNull().default(25),
  createdAt: createdAt(),
});

// ---------------------------------------------------------------------------
// Accounts

/**
 * One parent account per household (signing in with email), and from
 * Grade 6 a student login per child (signing in with a username).
 */
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    role: userRole("role").notNull(),
    /** Parents sign in with their email, stored lower-cased. */
    email: text("email").unique(),
    /** Students sign in with a username their parent chose, stored lower-cased. */
    username: text("username").unique(),
    passwordHash: text("password_hash").notNull(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    childId: uuid("child_id").references(() => children.id, { onDelete: "cascade" }),
    lastSignInAt: timestamp("last_sign_in_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    index("users_household_idx").on(t.householdId),
    check("users_parent_email", sql`${t.role} <> 'parent' or ${t.email} is not null`),
    check("users_student_login", sql`${t.role} <> 'student' or (${t.username} is not null and ${t.childId} is not null)`),
  ],
);

/** Signed-in sessions. The cookie holds a random token; only its SHA-256 is stored. */
export const sessions = pgTable(
  "sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

/** One-time password-reset links, stored hashed like sessions. */
export const passwordResets = pgTable("password_resets", {
  tokenHash: text("token_hash").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: createdAt(),
});

/** Stripe webhook events already handled, so a redelivery is applied once. */
export const stripeEvents = pgTable("stripe_events", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }).notNull().defaultNow(),
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
    /** For the ages on the Declaration of Intent. */
    birthDate: date("birth_date"),
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

/**
 * What was recorded today on each Teaching card: the prototype's `today`
 * state. One row per course and track group (daily core or weekly work) per
 * day; it drives the card's "Recorded" line and its Undo.
 */
export const teachingEntries = pgTable(
  "teaching_entries",
  {
    childId: uuid("child_id")
      .notNull()
      .references(() => children.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    grade: smallint("grade").notNull(),
    courseId: text("course_id").notNull(),
    /** 'd' for the daily core, 'q' for the week's work. */
    lane: text("lane").notNull(),
    week: smallint("week").notNull(),
    track: trackKind("track").notNull(),
    itemKey: text("item_key").notNull(),
    /** 'well' (done) or 'again' (needs another day). */
    outcome: text("outcome").notNull(),
    /** The course position before this entry, and whether the entry finished the week. */
    prevPos: smallint("prev_pos").notNull(),
    advanced: boolean("advanced").notNull().default(false),
    /** The parent moved on to the next item, so the card shows it in full again. */
    cleared: boolean("cleared").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.childId, t.date, t.courseId, t.lane] }),
    foreignKey({ columns: [t.grade, t.courseId], foreignColumns: [courses.grade, courses.id] }),
    check("teaching_entries_lane", sql`${t.lane} in ('d', 'q')`),
    check("teaching_entries_outcome", sql`${t.outcome} in ('well', 'again')`),
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
    /** Paper mode: the day's routine was done from the booklets (routine minutes are a usual day's). */
    paperRoutine: boolean("paper_routine").notNull().default(false),
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
// State forms

/** The parent's words for the annual progress report, one per required subject per school year. */
export const reportNotes = pgTable(
  "report_notes",
  {
    childId: uuid("child_id")
      .notNull()
      .references(() => children.id, { onDelete: "cascade" }),
    /** The school year's first day. */
    schoolYear: date("school_year").notNull(),
    subject: text("subject").notNull(),
    note: text("note").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.childId, t.schoolYear, t.subject] })],
);

/** When the family filed a form with the state, e.g. the Declaration of Intent for a school year. */
export const filings = pgTable(
  "filings",
  {
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    form: text("form").notNull(),
    schoolYear: date("school_year").notNull(),
    filedOn: date("filed_on").notNull(),
  },
  (t) => [primaryKey({ columns: [t.householdId, t.form, t.schoolYear] })],
);

/** A practice session from a grade guide done on a day, e.g. Grade 3 test readiness, session 1–10. */
export const guideSessions = pgTable(
  "guide_sessions",
  {
    childId: uuid("child_id")
      .notNull()
      .references(() => children.id, { onDelete: "cascade" }),
    grade: smallint("grade").notNull(),
    guideId: text("guide_id").notNull(),
    session: smallint("session").notNull(),
    doneOn: date("done_on").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.childId, t.grade, t.guideId, t.session] }),
    check("guide_sessions_session", sql`${t.session} between 1 and 10`),
  ],
);

/** When a child sat a standardized test. Only the date: scores stay with the family. */
export const testRecords = pgTable(
  "test_records",
  {
    childId: uuid("child_id")
      .notNull()
      .references(() => children.id, { onDelete: "cascade" }),
    testId: text("test_id").notNull(),
    givenOn: date("given_on").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.childId, t.testId] })],
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
  teachingEntries: many(teachingEntries),
  guideSessions: many(guideSessions),
  testRecords: many(testRecords),
}));

export const teachingEntriesRelations = relations(teachingEntries, ({ one }) => ({
  child: one(children, { fields: [teachingEntries.childId], references: [children.id] }),
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

export const guideSessionsRelations = relations(guideSessions, ({ one }) => ({
  child: one(children, { fields: [guideSessions.childId], references: [children.id] }),
}));

export const testRecordsRelations = relations(testRecords, ({ one }) => ({
  child: one(children, { fields: [testRecords.childId], references: [children.id] }),
}));
