CREATE TABLE "user_admin_activity" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_id" text NOT NULL,
	"target_id" text,
	"target_name" text NOT NULL,
	"action" text NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_admin_activity_action_check" CHECK ("user_admin_activity"."action" in ('reset', 'suspend', 'reactivate', 'sign_out'))
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "suspended_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "sessions_revoked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_admin_activity" ADD CONSTRAINT "user_admin_activity_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_admin_activity" ADD CONSTRAINT "user_admin_activity_target_id_user_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_admin_activity_target_idx" ON "user_admin_activity" USING btree ("target_id","created_at");--> statement-breakpoint
CREATE INDEX "user_admin_activity_date_idx" ON "user_admin_activity" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "admin_not_suspended_check" CHECK ("user"."role" <> 'admin' or "user"."suspended_at" is null);