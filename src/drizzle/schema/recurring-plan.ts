import { sql } from "drizzle-orm";
import {
    boolean,
    check,
    date,
    index,
    integer,
    jsonb,
    pgTable,
    primaryKey,
    text,
    timestamp,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";
import { pushSubscription } from "./push-subscription";

export type RecurringSnapshot = {
    title: string;
    notes: string;
    timezone: string;
    minutes: number;
    surahNumber: number | null;
    resourceUrl: string | null;
};

export const recurringPlan = pgTable(
    "recurring_plan",
    {
        id: text("id").primaryKey(),
        userId: text("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        title: text("title").notNull(),
        notes: text("notes").notNull().default(""),
        days: jsonb("days").$type<number[]>().notNull(),
        timezone: text("timezone").notNull(),
        minutes: integer("minutes").notNull(),
        reminderTime: text("reminder_time"),
        surahNumber: integer("surah_number"),
        resourceUrl: text("resource_url"),
        startDate: date("start_date", { mode: "string" }).notNull(),
        enabled: boolean("enabled").notNull().default(true),
        archived: boolean("archived").notNull().default(false),
        revision: integer("revision").notNull().default(1),
        createdAt: timestamp("created_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (t) => [
        index("recurring_plan_user_idx").on(t.userId),
        check(
            "recurring_plan_minutes_check",
            sql`${t.minutes} between 5 and 480`,
        ),
        check(
            "recurring_plan_surah_check",
            sql`${t.surahNumber} between 1 and 114`,
        ),
    ],
);

export const recurringOccurrence = pgTable(
    "recurring_occurrence",
    {
        planId: text("plan_id")
            .notNull()
            .references(() => recurringPlan.id, { onDelete: "cascade" }),
        localDate: date("local_date", { mode: "string" }).notNull(),
        status: text("status", { enum: ["completed", "skipped"] }).notNull(),
        snapshot: jsonb("snapshot").$type<RecurringSnapshot>().notNull(),
        recordedAt: timestamp("recorded_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (t) => [
        primaryKey({ columns: [t.planId, t.localDate] }),
        check(
            "recurring_occurrence_status_check",
            sql`${t.status} in ('completed', 'skipped')`,
        ),
    ],
);

export const recurringReminderDelivery = pgTable(
    "recurring_reminder_delivery",
    {
        planId: text("plan_id")
            .notNull()
            .references(() => recurringPlan.id, { onDelete: "cascade" }),
        subscriptionId: text("subscription_id")
            .notNull()
            .references(() => pushSubscription.id, { onDelete: "cascade" }),
        localDate: date("local_date", { mode: "string" }).notNull(),
        claimedAt: timestamp("claimed_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
        sentAt: timestamp("sent_at", { withTimezone: true }),
    },
    (t) => [primaryKey({ columns: [t.planId, t.subscriptionId, t.localDate] })],
);
