CREATE TABLE "memorization_assessment" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"assignment_id" text NOT NULL,
	"source_key" text NOT NULL,
	"method" text NOT NULL,
	"outcome" text NOT NULL,
	"reviewer_id" text,
	"riwayah" text NOT NULL,
	"start_surah_number" integer NOT NULL,
	"start_ayah_number" integer NOT NULL,
	"end_surah_number" integer NOT NULL,
	"end_ayah_number" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "memorization_assessment_method_check" CHECK ("memorization_assessment"."method" in ('self', 'peer')),
	CONSTRAINT "memorization_assessment_outcome_check" CHECK ("memorization_assessment"."outcome" in ('confirmed', 'needs_revision')),
	CONSTRAINT "memorization_assessment_riwayah_check" CHECK ("memorization_assessment"."riwayah" in ('hafs', 'warsh')),
	CONSTRAINT "memorization_assessment_range_check" CHECK ("memorization_assessment"."start_surah_number" between 1 and 114 and "memorization_assessment"."end_surah_number" between 1 and 114 and "memorization_assessment"."start_ayah_number" between 1 and 286 and "memorization_assessment"."end_ayah_number" between 1 and 286 and ("memorization_assessment"."start_surah_number" * 1000 + "memorization_assessment"."start_ayah_number") <= ("memorization_assessment"."end_surah_number" * 1000 + "memorization_assessment"."end_ayah_number"))
);
--> statement-breakpoint
CREATE TABLE "memorization_baseline_change" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"previous_hizbs" jsonb NOT NULL,
	"hizbs" jsonb NOT NULL,
	"source" text NOT NULL,
	"request_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memorization_correction_request" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"reviewer_id" text,
	"review_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	"used_at" timestamp with time zone,
	CONSTRAINT "memorization_correction_status_check" CHECK ("memorization_correction_request"."status" in ('pending', 'approved', 'declined', 'used'))
);
--> statement-breakpoint
CREATE TABLE "memorization_record" (
	"user_id" text PRIMARY KEY NOT NULL,
	"setup_at" timestamp with time zone,
	"baseline_riwayah" text DEFAULT 'hafs' NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"correction_used_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "memorization_assessment" ADD CONSTRAINT "memorization_assessment_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memorization_assessment" ADD CONSTRAINT "memorization_assessment_reviewer_id_user_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memorization_baseline_change" ADD CONSTRAINT "memorization_baseline_change_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memorization_baseline_change" ADD CONSTRAINT "memorization_baseline_change_request_id_memorization_correction_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."memorization_correction_request"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memorization_correction_request" ADD CONSTRAINT "memorization_correction_request_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memorization_correction_request" ADD CONSTRAINT "memorization_correction_request_reviewer_id_user_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memorization_record" ADD CONSTRAINT "memorization_record_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "memorization_assessment_source_idx" ON "memorization_assessment" USING btree ("source_key");--> statement-breakpoint
CREATE INDEX "memorization_assessment_user_idx" ON "memorization_assessment" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "memorization_baseline_user_idx" ON "memorization_baseline_change" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "memorization_correction_open_idx" ON "memorization_correction_request" USING btree ("user_id") WHERE "memorization_correction_request"."status" in ('pending', 'approved');--> statement-breakpoint
CREATE INDEX "memorization_correction_status_idx" ON "memorization_correction_request" USING btree ("status","created_at");--> statement-breakpoint
-- Preserve previously reviewed ranges without claiming unreviewed preparation as memorization.
INSERT INTO "memorization_assessment" ("id", "user_id", "assignment_id", "source_key", "method", "outcome", "reviewer_id", "riwayah", "start_surah_number", "start_ayah_number", "end_surah_number", "end_ayah_number", "created_at")
SELECT 'legacy-' || "id", "assignee_id", "id", 'legacy:' || "id", "review_method", 'confirmed', "reviewed_by_id", "riwayah", "start_surah_number", "start_ayah_number", "end_surah_number", "end_ayah_number", COALESCE("reviewed_at", "updated_at")
FROM "practice_assignment"
WHERE "status" = 'completed' AND "review_method" IN ('self', 'peer') AND "riwayah" IN ('hafs', 'warsh')
ON CONFLICT DO NOTHING;
