ALTER TYPE "public"."streak_status" ADD VALUE 'travel';--> statement-breakpoint
CREATE TABLE "teaching_entries" (
	"child_id" uuid NOT NULL,
	"date" date NOT NULL,
	"grade" smallint NOT NULL,
	"course_id" text NOT NULL,
	"lane" text NOT NULL,
	"week" smallint NOT NULL,
	"track" "track_kind" NOT NULL,
	"item_key" text NOT NULL,
	"outcome" text NOT NULL,
	"prev_pos" smallint NOT NULL,
	"advanced" boolean DEFAULT false NOT NULL,
	"cleared" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "teaching_entries_child_id_date_course_id_lane_pk" PRIMARY KEY("child_id","date","course_id","lane"),
	CONSTRAINT "teaching_entries_lane" CHECK ("teaching_entries"."lane" in ('d', 'q')),
	CONSTRAINT "teaching_entries_outcome" CHECK ("teaching_entries"."outcome" in ('well', 'again'))
);
--> statement-breakpoint
ALTER TABLE "attendance_days" ADD COLUMN "paper_routine" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "households" ADD COLUMN "timezone" text DEFAULT 'America/New_York' NOT NULL;--> statement-breakpoint
ALTER TABLE "teaching_entries" ADD CONSTRAINT "teaching_entries_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teaching_entries" ADD CONSTRAINT "teaching_entries_grade_course_id_courses_grade_id_fk" FOREIGN KEY ("grade","course_id") REFERENCES "public"."courses"("grade","id") ON DELETE no action ON UPDATE no action;