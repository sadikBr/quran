CREATE TABLE "memorization_mistake" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"riwayah" text NOT NULL,
	"surah_number" integer NOT NULL,
	"ayah_number" integer NOT NULL,
	"kind" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"occurrences" integer DEFAULT 1 NOT NULL,
	"practice_count" integer DEFAULT 0 NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"reported_by_id" text,
	"resolved_at" timestamp with time zone,
	"last_occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "memorization_mistake_reference_check" CHECK ("memorization_mistake"."surah_number" between 1 and 114 and "memorization_mistake"."ayah_number" between 1 and 286),
	CONSTRAINT "memorization_mistake_kind_check" CHECK ("memorization_mistake"."kind" in ('word', 'continuation', 'transition')),
	CONSTRAINT "memorization_mistake_riwayah_check" CHECK ("memorization_mistake"."riwayah" in ('hafs', 'warsh')),
	CONSTRAINT "memorization_mistake_note_check" CHECK (length("memorization_mistake"."note") <= 1000)
);
--> statement-breakpoint
CREATE TABLE "memorization_mistake_event" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"mistake_id" text NOT NULL,
	"action" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "memorization_mistake_event_action_check" CHECK ("memorization_mistake_event"."action" in ('noticed', 'practised', 'resolved', 'reopened'))
);
--> statement-breakpoint
ALTER TABLE "revision_session" ADD COLUMN "review_after" date;--> statement-breakpoint
ALTER TABLE "memorization_mistake" ADD CONSTRAINT "memorization_mistake_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memorization_mistake" ADD CONSTRAINT "memorization_mistake_reported_by_id_user_id_fk" FOREIGN KEY ("reported_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memorization_mistake_event" ADD CONSTRAINT "memorization_mistake_event_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memorization_mistake_event" ADD CONSTRAINT "memorization_mistake_event_mistake_id_memorization_mistake_id_fk" FOREIGN KEY ("mistake_id") REFERENCES "public"."memorization_mistake"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "memorization_mistake_reference_idx" ON "memorization_mistake" USING btree ("user_id","riwayah","surah_number","ayah_number","kind");--> statement-breakpoint
CREATE INDEX "memorization_mistake_user_idx" ON "memorization_mistake" USING btree ("user_id","resolved_at");--> statement-breakpoint
CREATE INDEX "memorization_mistake_event_user_idx" ON "memorization_mistake_event" USING btree ("user_id","created_at");