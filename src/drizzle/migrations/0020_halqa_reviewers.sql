ALTER TABLE "group_member" ADD COLUMN "is_reviewer" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "practice_assignment" ADD COLUMN "reviewed_by_id" text;--> statement-breakpoint
ALTER TABLE "practice_assignment" ADD COLUMN "review_method" text;--> statement-breakpoint
ALTER TABLE "practice_assignment" ADD CONSTRAINT "practice_assignment_reviewed_by_id_user_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;