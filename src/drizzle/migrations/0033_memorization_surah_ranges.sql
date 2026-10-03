ALTER TABLE "memorization_baseline_change" ADD COLUMN "previous_ranges" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "memorization_baseline_change" ADD COLUMN "ranges" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "memorization_record" ADD COLUMN "baseline_ranges" jsonb DEFAULT '[]'::jsonb NOT NULL;