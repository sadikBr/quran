CREATE TABLE "recurring_occurrence" (
	"plan_id" text NOT NULL,
	"local_date" date NOT NULL,
	"status" text NOT NULL,
	"snapshot" jsonb NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recurring_occurrence_plan_id_local_date_pk" PRIMARY KEY("plan_id","local_date"),
	CONSTRAINT "recurring_occurrence_status_check" CHECK ("recurring_occurrence"."status" in ('completed', 'skipped'))
);
--> statement-breakpoint
CREATE TABLE "recurring_plan" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"days" jsonb NOT NULL,
	"timezone" text NOT NULL,
	"minutes" integer NOT NULL,
	"reminder_time" text,
	"surah_number" integer,
	"resource_url" text,
	"start_date" date NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recurring_plan_minutes_check" CHECK ("recurring_plan"."minutes" between 5 and 480),
	CONSTRAINT "recurring_plan_surah_check" CHECK ("recurring_plan"."surah_number" between 1 and 114)
);
--> statement-breakpoint
CREATE TABLE "recurring_reminder_delivery" (
	"plan_id" text NOT NULL,
	"subscription_id" text NOT NULL,
	"local_date" date NOT NULL,
	"claimed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	CONSTRAINT "recurring_reminder_delivery_plan_id_subscription_id_local_date_pk" PRIMARY KEY("plan_id","subscription_id","local_date")
);
--> statement-breakpoint
ALTER TABLE "recurring_occurrence" ADD CONSTRAINT "recurring_occurrence_plan_id_recurring_plan_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."recurring_plan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_plan" ADD CONSTRAINT "recurring_plan_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_reminder_delivery" ADD CONSTRAINT "recurring_reminder_delivery_plan_id_recurring_plan_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."recurring_plan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_reminder_delivery" ADD CONSTRAINT "recurring_reminder_delivery_subscription_id_push_subscription_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."push_subscription"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "recurring_plan_user_idx" ON "recurring_plan" USING btree ("user_id");