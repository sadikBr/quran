CREATE TABLE "revision_plan" (
	"user_id" text PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"days" jsonb NOT NULL,
	"quarters_per_day" integer NOT NULL,
	"timezone" text NOT NULL,
	"riwayah" text NOT NULL,
	"reminder_time" text,
	"revision" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "revision_plan_amount_check" CHECK ("revision_plan"."quarters_per_day" in (1, 2, 4))
);
--> statement-breakpoint
CREATE TABLE "revision_reminder_delivery" (
	"subscription_id" text NOT NULL,
	"local_date" date NOT NULL,
	"claimed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	CONSTRAINT "revision_reminder_delivery_subscription_id_local_date_pk" PRIMARY KEY("subscription_id","local_date")
);
--> statement-breakpoint
CREATE TABLE "revision_session" (
	"id" text PRIMARY KEY NOT NULL,
	"week_id" text NOT NULL,
	"user_id" text NOT NULL,
	"scheduled_date" date NOT NULL,
	"ordinal" integer NOT NULL,
	"quarters" jsonb NOT NULL,
	"start_surah_number" integer NOT NULL,
	"start_ayah_number" integer NOT NULL,
	"end_surah_number" integer NOT NULL,
	"end_ayah_number" integer NOT NULL,
	"progress_surah_number" integer,
	"progress_ayah_number" integer,
	"outcome" text,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "revision_week" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"week_start" date NOT NULL,
	"timezone" text NOT NULL,
	"riwayah" text NOT NULL,
	"days" jsonb NOT NULL,
	"quarters_per_day" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "revision_plan" ADD CONSTRAINT "revision_plan_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revision_reminder_delivery" ADD CONSTRAINT "revision_reminder_delivery_subscription_id_push_subscription_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."push_subscription"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revision_session" ADD CONSTRAINT "revision_session_week_id_revision_week_id_fk" FOREIGN KEY ("week_id") REFERENCES "public"."revision_week"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revision_session" ADD CONSTRAINT "revision_session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revision_week" ADD CONSTRAINT "revision_week_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "revision_session_week_order_idx" ON "revision_session" USING btree ("week_id","ordinal");--> statement-breakpoint
CREATE INDEX "revision_session_user_idx" ON "revision_session" USING btree ("user_id","scheduled_date");--> statement-breakpoint
CREATE UNIQUE INDEX "revision_week_user_date_idx" ON "revision_week" USING btree ("user_id","week_start");