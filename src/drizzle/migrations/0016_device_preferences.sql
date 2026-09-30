CREATE TYPE "public"."vibration" AS ENUM('off', 'gentle', 'strong');--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "keep_screen_awake" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "vibration" "vibration" DEFAULT 'off' NOT NULL;