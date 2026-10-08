CREATE TABLE "daily_adhkar_completion" (
	"user_id" text NOT NULL,
	"local_date" date NOT NULL,
	"category" text NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "daily_adhkar_completion_user_id_local_date_category_pk" PRIMARY KEY("user_id","local_date","category")
);
--> statement-breakpoint
CREATE TABLE "daily_checklist_settings" (
	"user_id" text PRIMARY KEY NOT NULL,
	"visible" jsonb NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "daily_adhkar_completion" ADD CONSTRAINT "daily_adhkar_completion_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_checklist_settings" ADD CONSTRAINT "daily_checklist_settings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;