-- Keep legacy unused enum types intact; this migration only makes the host optional.
ALTER TABLE "group_meeting" ALTER COLUMN "host_user_id" DROP NOT NULL;
