CREATE TABLE "weekly_planning" (
	"user_id" text NOT NULL,
	"week_start" date NOT NULL,
	"capacities" jsonb NOT NULL,
	"estimates" jsonb NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "weekly_planning_user_id_week_start_pk" PRIMARY KEY("user_id","week_start")
);
--> statement-breakpoint
ALTER TABLE "memorization_session" ADD COLUMN "planned_date" date;--> statement-breakpoint
ALTER TABLE "practice_assignment" ADD COLUMN "planned_date" date;--> statement-breakpoint
ALTER TABLE "revision_session" ADD COLUMN "planned_date" date;--> statement-breakpoint
ALTER TABLE "weekly_planning" ADD CONSTRAINT "weekly_planning_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;