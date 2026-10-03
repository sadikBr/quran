CREATE TABLE "learning_schedule" (
	"user_id" text PRIMARY KEY NOT NULL,
	"revision_days" jsonb NOT NULL,
	"memorization_days" jsonb NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memorization_plan" (
	"user_id" text PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"quarters_per_week" integer NOT NULL,
	"start_quarter" integer NOT NULL,
	"direction" text NOT NULL,
	"timezone" text NOT NULL,
	"riwayah" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "memorization_plan_amount_check" CHECK ("memorization_plan"."quarters_per_week" between 1 and 28),
	CONSTRAINT "memorization_plan_start_check" CHECK ("memorization_plan"."start_quarter" between 1 and 240)
);
--> statement-breakpoint
CREATE TABLE "memorization_session" (
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
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "memorization_week" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"week_start" date NOT NULL,
	"timezone" text NOT NULL,
	"riwayah" text NOT NULL,
	"days" jsonb NOT NULL,
	"quarters_per_week" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "learning_schedule" ADD CONSTRAINT "learning_schedule_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memorization_plan" ADD CONSTRAINT "memorization_plan_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memorization_session" ADD CONSTRAINT "memorization_session_week_id_memorization_week_id_fk" FOREIGN KEY ("week_id") REFERENCES "public"."memorization_week"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memorization_session" ADD CONSTRAINT "memorization_session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memorization_week" ADD CONSTRAINT "memorization_week_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "memorization_session_week_order_idx" ON "memorization_session" USING btree ("week_id","ordinal");--> statement-breakpoint
CREATE UNIQUE INDEX "memorization_week_user_date_idx" ON "memorization_week" USING btree ("user_id","week_start");
--> statement-breakpoint
INSERT INTO "learning_schedule" ("user_id", "revision_days", "memorization_days")
SELECT "user_id", "days", '[]'::jsonb FROM "revision_plan"
ON CONFLICT ("user_id") DO NOTHING;
