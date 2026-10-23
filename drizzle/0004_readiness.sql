CREATE TABLE "guide_sessions" (
	"child_id" uuid NOT NULL,
	"grade" smallint NOT NULL,
	"guide_id" text NOT NULL,
	"session" smallint NOT NULL,
	"done_on" date NOT NULL,
	CONSTRAINT "guide_sessions_child_id_grade_guide_id_session_pk" PRIMARY KEY("child_id","grade","guide_id","session"),
	CONSTRAINT "guide_sessions_session" CHECK ("guide_sessions"."session" between 1 and 10)
);
--> statement-breakpoint
CREATE TABLE "test_records" (
	"child_id" uuid NOT NULL,
	"test_id" text NOT NULL,
	"given_on" date NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "test_records_child_id_test_id_pk" PRIMARY KEY("child_id","test_id")
);
--> statement-breakpoint
ALTER TABLE "guide_sessions" ADD CONSTRAINT "guide_sessions_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_records" ADD CONSTRAINT "test_records_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;