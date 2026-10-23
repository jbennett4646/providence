CREATE TABLE "filings" (
	"household_id" uuid NOT NULL,
	"form" text NOT NULL,
	"school_year" date NOT NULL,
	"filed_on" date NOT NULL,
	CONSTRAINT "filings_household_id_form_school_year_pk" PRIMARY KEY("household_id","form","school_year")
);
--> statement-breakpoint
CREATE TABLE "report_notes" (
	"child_id" uuid NOT NULL,
	"school_year" date NOT NULL,
	"subject" text NOT NULL,
	"note" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "report_notes_child_id_school_year_subject_pk" PRIMARY KEY("child_id","school_year","subject")
);
--> statement-breakpoint
ALTER TABLE "children" ADD COLUMN "birth_date" date;--> statement-breakpoint
ALTER TABLE "households" ADD COLUMN "parent_name" text;--> statement-breakpoint
ALTER TABLE "households" ADD COLUMN "address_line1" text;--> statement-breakpoint
ALTER TABLE "households" ADD COLUMN "address_line2" text;--> statement-breakpoint
ALTER TABLE "households" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "households" ADD COLUMN "county" text;--> statement-breakpoint
ALTER TABLE "households" ADD COLUMN "postal_code" text;--> statement-breakpoint
ALTER TABLE "households" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "filings" ADD CONSTRAINT "filings_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_notes" ADD CONSTRAINT "report_notes_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;