CREATE TABLE "adhkar_reminder_delivery" (
	"subscription_id" text NOT NULL,
	"kind" text NOT NULL,
	"local_date" date NOT NULL,
	"claimed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	CONSTRAINT "adhkar_reminder_delivery_subscription_id_kind_local_date_pk" PRIMARY KEY("subscription_id","kind","local_date")
);
--> statement-breakpoint
ALTER TABLE "adhkar_reminder_delivery" ADD CONSTRAINT "adhkar_reminder_delivery_subscription_id_push_subscription_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."push_subscription"("id") ON DELETE cascade ON UPDATE no action;