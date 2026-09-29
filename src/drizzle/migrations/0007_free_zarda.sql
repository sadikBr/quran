ALTER TABLE "user_settings" ADD COLUMN "morning_adhkar_time" text;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "evening_adhkar_time" text;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "adhkar_timezone" text DEFAULT 'Africa/Casablanca' NOT NULL;