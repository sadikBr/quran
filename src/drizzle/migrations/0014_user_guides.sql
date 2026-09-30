CREATE TABLE "user_guide_progress" (
	"user_id" text NOT NULL,
	"guide_id" text NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	CONSTRAINT "user_guide_progress_user_id_guide_id_pk" PRIMARY KEY("user_id","guide_id")
);
--> statement-breakpoint
ALTER TABLE "user_guide_progress" ADD CONSTRAINT "user_guide_progress_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;