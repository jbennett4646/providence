CREATE TYPE "public"."item_outcome" AS ENUM('well');--> statement-breakpoint
CREATE TYPE "public"."plan" AS ENUM('household', 'parish');--> statement-breakpoint
CREATE TYPE "public"."streak_status" AS ENUM('done', 'sick');--> statement-breakpoint
CREATE TYPE "public"."teaching_mode" AS ENUM('screen', 'paper');--> statement-breakpoint
CREATE TYPE "public"."track_kind" AS ENUM('daily', 'queue', 'weekly');--> statement-breakpoint
CREATE TABLE "attendance_days" (
	"child_id" uuid NOT NULL,
	"date" date NOT NULL,
	"routine_mins" integer DEFAULT 0 NOT NULL,
	"extra" jsonb DEFAULT '[]'::jsonb NOT NULL,
	CONSTRAINT "attendance_days_child_id_date_pk" PRIMARY KEY("child_id","date"),
	CONSTRAINT "attendance_routine_mins" CHECK ("attendance_days"."routine_mins" >= 0)
);
--> statement-breakpoint
CREATE TABLE "calendar_breaks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"label" text NOT NULL,
	"from" date NOT NULL,
	"to" date NOT NULL,
	CONSTRAINT "calendar_breaks_range" CHECK ("calendar_breaks"."from" <= "calendar_breaks"."to")
);
--> statement-breakpoint
CREATE TABLE "checkins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"child_id" uuid NOT NULL,
	"grade" smallint NOT NULL,
	"course_id" text NOT NULL,
	"label" text NOT NULL,
	"result" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "children" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"name" text NOT NULL,
	"grade" smallint NOT NULL,
	"mode" "teaching_mode" DEFAULT 'screen' NOT NULL,
	"prior_days" smallint DEFAULT 0 NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "children_grade_range" CHECK ("children"."grade" between 0 and 12),
	CONSTRAINT "children_prior_days" CHECK ("children"."prior_days" >= 0)
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"grade" smallint NOT NULL,
	"id" text NOT NULL,
	"course" text NOT NULL,
	"dash" text NOT NULL,
	"number" text NOT NULL,
	"file" text NOT NULL,
	"elective" boolean DEFAULT false NOT NULL,
	"sort_order" smallint NOT NULL,
	CONSTRAINT "courses_grade_id_pk" PRIMARY KEY("grade","id")
);
--> statement-breakpoint
CREATE TABLE "enrollments" (
	"child_id" uuid NOT NULL,
	"grade" smallint NOT NULL,
	"course_id" text NOT NULL,
	"pos" smallint DEFAULT 1 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"review_term" smallint,
	"follow_up_week" smallint,
	"follow_up_text" text,
	CONSTRAINT "enrollments_child_id_grade_course_id_pk" PRIMARY KEY("child_id","grade","course_id"),
	CONSTRAINT "enrollments_pos_range" CHECK ("enrollments"."pos" between 1 and 37),
	CONSTRAINT "enrollments_review_term" CHECK ("enrollments"."review_term" is null or "enrollments"."review_term" between 1 and 6)
);
--> statement-breakpoint
CREATE TABLE "gates" (
	"child_id" uuid NOT NULL,
	"grade" smallint NOT NULL,
	"course_id" text NOT NULL,
	"term" smallint NOT NULL,
	"score" integer,
	"of" integer,
	"pass" boolean NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gates_child_id_grade_course_id_term_pk" PRIMARY KEY("child_id","grade","course_id","term"),
	CONSTRAINT "gates_term_range" CHECK ("gates"."term" between 1 and 6)
);
--> statement-breakpoint
CREATE TABLE "holiday_teach" (
	"household_id" uuid NOT NULL,
	"date" date NOT NULL,
	CONSTRAINT "holiday_teach_household_id_date_pk" PRIMARY KEY("household_id","date")
);
--> statement-breakpoint
CREATE TABLE "households" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"state" text DEFAULT 'GA' NOT NULL,
	"plan" "plan",
	"school_days" smallint[] DEFAULT '{1,2,3,4,5}'::smallint[] NOT NULL,
	"cal_start" date,
	"prefs" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "item_records" (
	"child_id" uuid NOT NULL,
	"grade" smallint NOT NULL,
	"course_id" text NOT NULL,
	"week" smallint NOT NULL,
	"track" "track_kind" NOT NULL,
	"item_key" text NOT NULL,
	"outcome" "item_outcome" DEFAULT 'well' NOT NULL,
	"done_on" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "item_records_child_id_grade_course_id_week_track_item_key_pk" PRIMARY KEY("child_id","grade","course_id","week","track","item_key"),
	CONSTRAINT "item_records_week_range" CHECK ("item_records"."week" between 1 and 36)
);
--> statement-breakpoint
CREATE TABLE "printed_docs" (
	"child_id" uuid NOT NULL,
	"grade" smallint NOT NULL,
	"course_id" text NOT NULL,
	"doc" text NOT NULL,
	"printed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "printed_docs_child_id_grade_course_id_doc_pk" PRIMARY KEY("child_id","grade","course_id","doc"),
	CONSTRAINT "printed_docs_doc" CHECK ("printed_docs"."doc" ~ '^(plan|t[1-6]|r[1-5])$')
);
--> statement-breakpoint
CREATE TABLE "streak_days" (
	"child_id" uuid NOT NULL,
	"date" date NOT NULL,
	"status" "streak_status" NOT NULL,
	CONSTRAINT "streak_days_child_id_date_pk" PRIMARY KEY("child_id","date")
);
--> statement-breakpoint
ALTER TABLE "attendance_days" ADD CONSTRAINT "attendance_days_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_breaks" ADD CONSTRAINT "calendar_breaks_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_grade_course_id_courses_grade_id_fk" FOREIGN KEY ("grade","course_id") REFERENCES "public"."courses"("grade","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "children" ADD CONSTRAINT "children_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_grade_course_id_courses_grade_id_fk" FOREIGN KEY ("grade","course_id") REFERENCES "public"."courses"("grade","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gates" ADD CONSTRAINT "gates_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gates" ADD CONSTRAINT "gates_grade_course_id_courses_grade_id_fk" FOREIGN KEY ("grade","course_id") REFERENCES "public"."courses"("grade","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "holiday_teach" ADD CONSTRAINT "holiday_teach_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_records" ADD CONSTRAINT "item_records_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_records" ADD CONSTRAINT "item_records_grade_course_id_courses_grade_id_fk" FOREIGN KEY ("grade","course_id") REFERENCES "public"."courses"("grade","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "printed_docs" ADD CONSTRAINT "printed_docs_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "printed_docs" ADD CONSTRAINT "printed_docs_grade_course_id_courses_grade_id_fk" FOREIGN KEY ("grade","course_id") REFERENCES "public"."courses"("grade","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "streak_days" ADD CONSTRAINT "streak_days_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "calendar_breaks_household_idx" ON "calendar_breaks" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "checkins_child_idx" ON "checkins" USING btree ("child_id","created_at");--> statement-breakpoint
CREATE INDEX "children_household_idx" ON "children" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "item_records_child_done_idx" ON "item_records" USING btree ("child_id","done_on");