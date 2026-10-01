-- Keep existing circles running; only newly created circles start in preparation.
ALTER TABLE "memorization_group" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "memorization_group" ALTER COLUMN "is_active" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "memorization_group" ADD COLUMN "active_since" timestamp with time zone;
