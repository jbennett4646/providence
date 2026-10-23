CREATE TYPE "public"."user_role" AS ENUM('parent', 'student');--> statement-breakpoint
CREATE TABLE "coops" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"owner_household_id" uuid NOT NULL,
	"invite_code" text NOT NULL,
	"max_households" smallint DEFAULT 25 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "coops_owner_household_id_unique" UNIQUE("owner_household_id"),
	CONSTRAINT "coops_invite_code_unique" UNIQUE("invite_code")
);
--> statement-breakpoint
CREATE TABLE "password_resets" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stripe_events" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role" "user_role" NOT NULL,
	"email" text,
	"username" text,
	"password_hash" text NOT NULL,
	"household_id" uuid NOT NULL,
	"child_id" uuid,
	"last_sign_in_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_parent_email" CHECK ("users"."role" <> 'parent' or "users"."email" is not null),
	CONSTRAINT "users_student_login" CHECK ("users"."role" <> 'student' or ("users"."username" is not null and "users"."child_id" is not null))
);
--> statement-breakpoint
ALTER TABLE "households" ADD COLUMN "onboarded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "households" ADD COLUMN "stripe_customer_id" text;--> statement-breakpoint
ALTER TABLE "households" ADD COLUMN "subscription_id" text;--> statement-breakpoint
ALTER TABLE "households" ADD COLUMN "subscription_status" text;--> statement-breakpoint
ALTER TABLE "households" ADD COLUMN "current_period_end" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "households" ADD COLUMN "cancel_at_period_end" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "households" ADD COLUMN "coop_id" uuid;--> statement-breakpoint
ALTER TABLE "coops" ADD CONSTRAINT "coops_owner_household_id_households_id_fk" FOREIGN KEY ("owner_household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "users_household_idx" ON "users" USING btree ("household_id");--> statement-breakpoint
ALTER TABLE "households" ADD CONSTRAINT "households_coop_id_coops_id_fk" FOREIGN KEY ("coop_id") REFERENCES "public"."coops"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "households" ADD CONSTRAINT "households_stripe_customer_id_unique" UNIQUE("stripe_customer_id");--> statement-breakpoint
ALTER TABLE "households" ADD CONSTRAINT "households_subscription_id_unique" UNIQUE("subscription_id");