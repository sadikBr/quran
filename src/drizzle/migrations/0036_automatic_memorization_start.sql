ALTER TABLE "memorization_plan" DROP CONSTRAINT "memorization_plan_start_check";--> statement-breakpoint
ALTER TABLE "memorization_week" ADD COLUMN "direction" text DEFAULT 'forward' NOT NULL;--> statement-breakpoint
ALTER TABLE "memorization_week" ADD COLUMN "baseline_revision" integer DEFAULT -1 NOT NULL;--> statement-breakpoint
UPDATE "memorization_week" AS w SET "direction" = p."direction" FROM "memorization_plan" AS p WHERE w."user_id" = p."user_id";--> statement-breakpoint
ALTER TABLE "memorization_plan" DROP COLUMN "start_quarter";
