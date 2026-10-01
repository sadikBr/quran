CREATE TYPE "public"."progress_status" AS ENUM('NotStarted', 'Learning', 'Memorized', 'Reviewing');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('User', 'Admin');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('Pending', 'InProgress', 'Completed', 'Overdue');--> statement-breakpoint
CREATE TYPE "public"."language" AS ENUM('en', 'ar');--> statement-breakpoint
CREATE TYPE "public"."reading_mode" AS ENUM('page', 'surah');--> statement-breakpoint
CREATE TYPE "public"."riwayah" AS ENUM('hafs', 'warsh');--> statement-breakpoint
CREATE TYPE "public"."theme" AS ENUM('system', 'light', 'dark');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email"),
	CONSTRAINT "user_role_check" CHECK ("user"."role" in ('admin', 'member'))
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_activity" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_id" text NOT NULL,
	"action" text NOT NULL,
	"group_id" text NOT NULL,
	"group_name" text NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookmark_collection" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"name_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_ayah_collection" (
	"user_id" text NOT NULL,
	"global_ayah_number" integer NOT NULL,
	"collection_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "saved_ayah_collection_user_id_global_ayah_number_collection_id_pk" PRIMARY KEY("user_id","global_ayah_number","collection_id")
);
--> statement-breakpoint
CREATE TABLE "user_khatmah_history" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"started_on" date NOT NULL,
	"completed_at" timestamp with time zone NOT NULL,
	"planned_weeks" integer NOT NULL,
	"actual_days" integer NOT NULL,
	"reading_days" integer NOT NULL,
	"measurement" text NOT NULL,
	"started_global_ayah" integer NOT NULL,
	"was_repeatable" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_khatmah_plan" (
	"user_id" text PRIMARY KEY NOT NULL,
	"target_date" date NOT NULL,
	"duration_weeks" integer DEFAULT 8 NOT NULL,
	"repeatable" boolean DEFAULT false NOT NULL,
	"cycle_started_on" date DEFAULT CURRENT_DATE NOT NULL,
	"cycle_reading_days" integer DEFAULT 0 NOT NULL,
	"start_global_ayah" integer NOT NULL,
	"current_global_ayah" integer NOT NULL,
	"measurement" text NOT NULL,
	"rest_days" integer[] DEFAULT '{}'::integer[] NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_meeting" (
	"id" text PRIMARY KEY NOT NULL,
	"group_id" text NOT NULL,
	"host_user_id" text NOT NULL,
	"room_name" text NOT NULL,
	"timezone" text NOT NULL,
	"active_window_minutes" integer DEFAULT 180 NOT NULL,
	"host_active_until" timestamp with time zone,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_meeting_attendance" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"user_id" text NOT NULL,
	"joined_at" timestamp with time zone,
	"active_joined_at" timestamp with time zone,
	"last_seen_at" timestamp with time zone,
	"left_at" timestamp with time zone,
	"attended_seconds" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'present' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_meeting_schedule" (
	"id" text PRIMARY KEY NOT NULL,
	"meeting_id" text NOT NULL,
	"weekday" integer NOT NULL,
	"local_time" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_meeting_session" (
	"id" text PRIMARY KEY NOT NULL,
	"meeting_id" text NOT NULL,
	"scheduled_starts_at" timestamp with time zone NOT NULL,
	"scheduled_ends_at" timestamp with time zone NOT NULL,
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"finalized_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_member" (
	"id" text PRIMARY KEY NOT NULL,
	"group_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "group_member_role_check" CHECK ("group_member"."role" in ('supervisor', 'member'))
);
--> statement-breakpoint
CREATE TABLE "memorization_group" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"invite_code" text NOT NULL,
	"created_by_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_memorized_hizb" (
	"user_id" text NOT NULL,
	"hizb_number" integer NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_memorized_hizb_user_id_hizb_number_pk" PRIMARY KEY("user_id","hizb_number"),
	CONSTRAINT "user_memorized_hizb_number_range" CHECK ("user_memorized_hizb"."hizb_number" between 1 and 60)
);
--> statement-breakpoint
CREATE TABLE "practice_assignment" (
	"id" text PRIMARY KEY NOT NULL,
	"assignee_id" text NOT NULL,
	"assigned_by_id" text NOT NULL,
	"group_id" text,
	"kind" text NOT NULL,
	"riwayah" text NOT NULL,
	"start_surah_number" integer NOT NULL,
	"start_ayah_number" integer NOT NULL,
	"end_surah_number" integer NOT NULL,
	"end_ayah_number" integer NOT NULL,
	"progress_surah_number" integer,
	"progress_ayah_number" integer,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"instructions" text,
	"due_at" timestamp with time zone,
	"review_note" text,
	"submitted_at" timestamp with time zone,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assignment_notification_delivery" (
	"id" text PRIMARY KEY NOT NULL,
	"assignment_id" text NOT NULL,
	"subscription_id" text NOT NULL,
	"kind" text NOT NULL,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_meeting_reminder_delivery" (
	"id" text PRIMARY KEY NOT NULL,
	"meeting_id" text NOT NULL,
	"subscription_id" text NOT NULL,
	"occurrence_starts_at" timestamp with time zone NOT NULL,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_meeting_start_delivery" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"subscription_id" text NOT NULL,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_subscription" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"user_agent" text,
	"last_wird_reminder_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_reading_progress" (
	"user_id" text PRIMARY KEY NOT NULL,
	"last_page_number" integer,
	"last_surah_number" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_ayah" (
	"user_id" text NOT NULL,
	"global_ayah_number" integer NOT NULL,
	"surah_number" integer NOT NULL,
	"ayah_number" integer NOT NULL,
	"page_number" integer NOT NULL,
	"surah_name" text NOT NULL,
	"arabic_text" text NOT NULL,
	"is_bookmarked" boolean DEFAULT false NOT NULL,
	"reflection" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "saved_ayah_user_id_global_ayah_number_pk" PRIMARY KEY("user_id","global_ayah_number")
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"user_id" text PRIMARY KEY NOT NULL,
	"theme" "theme" DEFAULT 'system' NOT NULL,
	"language" "language" DEFAULT 'en' NOT NULL,
	"riwayah" "riwayah" DEFAULT 'hafs' NOT NULL,
	"arabic_edition" text DEFAULT 'quranpedia.mushaf.1' NOT NULL,
	"reciter" text DEFAULT 'quranpedia/255' NOT NULL,
	"translation_edition" text DEFAULT 'quranpedia.translation.13638' NOT NULL,
	"tafsir_edition" text DEFAULT 'quranpedia.tafsir.2012' NOT NULL,
	"show_translation" boolean DEFAULT false NOT NULL,
	"reading_mode" "reading_mode" DEFAULT 'page' NOT NULL,
	"continuous_recitation" boolean DEFAULT false NOT NULL,
	"arabic_text_size" integer DEFAULT 3 NOT NULL,
	"wird_reminders_enabled" boolean DEFAULT true NOT NULL,
	"meeting_reminders_enabled" boolean DEFAULT true NOT NULL,
	"assignment_reminders_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_wird" (
	"user_id" text PRIMARY KEY NOT NULL,
	"unit" text NOT NULL,
	"amount" integer NOT NULL,
	"target_start_global_ayah" integer NOT NULL,
	"target_end_global_ayah" integer NOT NULL,
	"progress_global_ayah" integer,
	"target_date" date NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_wird_history" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"unit" text NOT NULL,
	"amount" integer NOT NULL,
	"target_start_global_ayah" integer NOT NULL,
	"target_end_global_ayah" integer NOT NULL,
	"target_date" date NOT NULL,
	"completed_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_activity" ADD CONSTRAINT "admin_activity_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmark_collection" ADD CONSTRAINT "bookmark_collection_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_ayah_collection" ADD CONSTRAINT "saved_ayah_collection_collection_id_bookmark_collection_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."bookmark_collection"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_ayah_collection" ADD CONSTRAINT "saved_ayah_collection_ayah_fk" FOREIGN KEY ("user_id","global_ayah_number") REFERENCES "public"."saved_ayah"("user_id","global_ayah_number") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_khatmah_history" ADD CONSTRAINT "user_khatmah_history_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_khatmah_plan" ADD CONSTRAINT "user_khatmah_plan_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_meeting" ADD CONSTRAINT "group_meeting_group_id_memorization_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."memorization_group"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_meeting" ADD CONSTRAINT "group_meeting_host_user_id_user_id_fk" FOREIGN KEY ("host_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_meeting_attendance" ADD CONSTRAINT "group_meeting_attendance_session_id_group_meeting_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."group_meeting_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_meeting_attendance" ADD CONSTRAINT "group_meeting_attendance_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_meeting_schedule" ADD CONSTRAINT "group_meeting_schedule_meeting_id_group_meeting_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."group_meeting"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_meeting_session" ADD CONSTRAINT "group_meeting_session_meeting_id_group_meeting_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."group_meeting"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_member" ADD CONSTRAINT "group_member_group_id_memorization_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."memorization_group"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_member" ADD CONSTRAINT "group_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memorization_group" ADD CONSTRAINT "memorization_group_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_memorized_hizb" ADD CONSTRAINT "user_memorized_hizb_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_assignment" ADD CONSTRAINT "practice_assignment_assignee_id_user_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_assignment" ADD CONSTRAINT "practice_assignment_assigned_by_id_user_id_fk" FOREIGN KEY ("assigned_by_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_assignment" ADD CONSTRAINT "practice_assignment_group_id_memorization_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."memorization_group"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_notification_delivery" ADD CONSTRAINT "assignment_notification_delivery_assignment_id_practice_assignment_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."practice_assignment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_notification_delivery" ADD CONSTRAINT "assignment_notification_delivery_subscription_id_push_subscription_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."push_subscription"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_meeting_reminder_delivery" ADD CONSTRAINT "group_meeting_reminder_delivery_meeting_id_group_meeting_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."group_meeting"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_meeting_reminder_delivery" ADD CONSTRAINT "group_meeting_reminder_delivery_subscription_id_push_subscription_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."push_subscription"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_meeting_start_delivery" ADD CONSTRAINT "group_meeting_start_delivery_session_id_group_meeting_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."group_meeting_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_meeting_start_delivery" ADD CONSTRAINT "group_meeting_start_delivery_subscription_id_push_subscription_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."push_subscription"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscription" ADD CONSTRAINT "push_subscription_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_reading_progress" ADD CONSTRAINT "user_reading_progress_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_ayah" ADD CONSTRAINT "saved_ayah_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_wird" ADD CONSTRAINT "user_wird_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_wird_history" ADD CONSTRAINT "user_wird_history_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "single_platform_admin_idx" ON "user" USING btree ("role") WHERE "user"."role" = 'admin';--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "admin_activity_date_idx" ON "admin_activity" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "bookmark_collection_user_name_idx" ON "bookmark_collection" USING btree ("user_id","name_key");--> statement-breakpoint
CREATE INDEX "bookmark_collection_user_idx" ON "bookmark_collection" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "saved_ayah_collection_collection_idx" ON "saved_ayah_collection" USING btree ("collection_id");--> statement-breakpoint
CREATE INDEX "user_khatmah_history_user_idx" ON "user_khatmah_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_khatmah_history_completed_idx" ON "user_khatmah_history" USING btree ("completed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "group_meeting_group_idx" ON "group_meeting" USING btree ("group_id");--> statement-breakpoint
CREATE UNIQUE INDEX "group_meeting_room_idx" ON "group_meeting" USING btree ("room_name");--> statement-breakpoint
CREATE INDEX "group_meeting_host_idx" ON "group_meeting" USING btree ("host_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "group_meeting_attendance_member_idx" ON "group_meeting_attendance" USING btree ("session_id","user_id");--> statement-breakpoint
CREATE INDEX "group_meeting_attendance_session_idx" ON "group_meeting_attendance" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "group_meeting_attendance_user_idx" ON "group_meeting_attendance" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "group_meeting_schedule_slot_idx" ON "group_meeting_schedule" USING btree ("meeting_id","weekday","local_time");--> statement-breakpoint
CREATE INDEX "group_meeting_schedule_meeting_idx" ON "group_meeting_schedule" USING btree ("meeting_id");--> statement-breakpoint
CREATE UNIQUE INDEX "group_meeting_session_occurrence_idx" ON "group_meeting_session" USING btree ("meeting_id","scheduled_starts_at");--> statement-breakpoint
CREATE INDEX "group_meeting_session_meeting_idx" ON "group_meeting_session" USING btree ("meeting_id");--> statement-breakpoint
CREATE UNIQUE INDEX "group_member_group_user_idx" ON "group_member" USING btree ("group_id","user_id");--> statement-breakpoint
CREATE INDEX "group_member_user_idx" ON "group_member" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "group_single_supervisor_idx" ON "group_member" USING btree ("group_id") WHERE "group_member"."role" = 'supervisor';--> statement-breakpoint
CREATE UNIQUE INDEX "memorization_group_invite_code_idx" ON "memorization_group" USING btree ("invite_code");--> statement-breakpoint
CREATE INDEX "memorization_group_creator_idx" ON "memorization_group" USING btree ("created_by_id");--> statement-breakpoint
CREATE INDEX "practice_assignment_assignee_idx" ON "practice_assignment" USING btree ("assignee_id","status");--> statement-breakpoint
CREATE INDEX "practice_assignment_group_idx" ON "practice_assignment" USING btree ("group_id");--> statement-breakpoint
CREATE UNIQUE INDEX "assignment_notification_delivery_once_idx" ON "assignment_notification_delivery" USING btree ("assignment_id","subscription_id","kind");--> statement-breakpoint
CREATE INDEX "assignment_notification_delivery_assignment_idx" ON "assignment_notification_delivery" USING btree ("assignment_id");--> statement-breakpoint
CREATE INDEX "assignment_notification_delivery_subscription_idx" ON "assignment_notification_delivery" USING btree ("subscription_id");--> statement-breakpoint
CREATE UNIQUE INDEX "group_meeting_reminder_delivery_once_idx" ON "group_meeting_reminder_delivery" USING btree ("meeting_id","subscription_id","occurrence_starts_at");--> statement-breakpoint
CREATE INDEX "group_meeting_reminder_delivery_meeting_idx" ON "group_meeting_reminder_delivery" USING btree ("meeting_id");--> statement-breakpoint
CREATE INDEX "group_meeting_reminder_delivery_subscription_idx" ON "group_meeting_reminder_delivery" USING btree ("subscription_id");--> statement-breakpoint
CREATE UNIQUE INDEX "group_meeting_start_delivery_once_idx" ON "group_meeting_start_delivery" USING btree ("session_id","subscription_id");--> statement-breakpoint
CREATE INDEX "group_meeting_start_delivery_session_idx" ON "group_meeting_start_delivery" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "group_meeting_start_delivery_subscription_idx" ON "group_meeting_start_delivery" USING btree ("subscription_id");--> statement-breakpoint
CREATE UNIQUE INDEX "push_subscription_endpoint_idx" ON "push_subscription" USING btree ("endpoint");--> statement-breakpoint
CREATE INDEX "push_subscription_user_idx" ON "push_subscription" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "saved_ayah_user_id_idx" ON "saved_ayah" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "saved_ayah_user_surah_idx" ON "saved_ayah" USING btree ("user_id","surah_number");--> statement-breakpoint
CREATE INDEX "user_wird_history_user_idx" ON "user_wird_history" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_wird_history_target_idx" ON "user_wird_history" USING btree ("user_id","target_date","target_start_global_ayah");