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
    uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";
import { pushSubscription } from "./push-subscription";

export const revisionPlan = pgTable(
    "revision_plan",
    {
        userId: text("user_id")
            .primaryKey()
            .references(() => user.id, { onDelete: "cascade" }),
        enabled: boolean("enabled").notNull().default(false),
        days: jsonb("days").$type<number[]>().notNull(),
        quartersPerDay: integer("quarters_per_day").notNull(),
        timezone: text("timezone").notNull(),
        riwayah: text("riwayah", { enum: ["hafs", "warsh"] }).notNull(),
        reminderTime: text("reminder_time"),
        revision: integer("revision").notNull().default(1),
        updatedAt: timestamp("updated_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (table) => [
        check(
            "revision_plan_amount_check",
            sql`${table.quartersPerDay} in (1, 2, 4)`,
        ),
    ],
);

export const revisionWeek = pgTable(
    "revision_week",
    {
        id: text("id").primaryKey(),
        userId: text("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        weekStart: date("week_start", { mode: "string" }).notNull(),
        timezone: text("timezone").notNull(),
        riwayah: text("riwayah", { enum: ["hafs", "warsh"] }).notNull(),
        days: jsonb("days").$type<number[]>().notNull(),
        quartersPerDay: integer("quarters_per_day").notNull(),
        createdAt: timestamp("created_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (table) => [
        uniqueIndex("revision_week_user_date_idx").on(
            table.userId,
            table.weekStart,
        ),
    ],
);

export const revisionSession = pgTable(
    "revision_session",
    {
        id: text("id").primaryKey(),
        weekId: text("week_id")
            .notNull()
            .references(() => revisionWeek.id, { onDelete: "cascade" }),
        userId: text("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        scheduledDate: date("scheduled_date", { mode: "string" }).notNull(),
        ordinal: integer("ordinal").notNull(),
        quarters: jsonb("quarters").$type<number[]>().notNull(),
        startSurahNumber: integer("start_surah_number").notNull(),
        startAyahNumber: integer("start_ayah_number").notNull(),
        endSurahNumber: integer("end_surah_number").notNull(),
        endAyahNumber: integer("end_ayah_number").notNull(),
        progressSurahNumber: integer("progress_surah_number"),
        progressAyahNumber: integer("progress_ayah_number"),
        outcome: text("outcome", { enum: ["comfortable", "difficult"] }),
        completedAt: timestamp("completed_at", { withTimezone: true }),
    },
    (table) => [
        uniqueIndex("revision_session_week_order_idx").on(
            table.weekId,
            table.ordinal,
        ),
        index("revision_session_user_idx").on(
            table.userId,
            table.scheduledDate,
        ),
    ],
);

export const revisionReminderDelivery = pgTable(
    "revision_reminder_delivery",
    {
        subscriptionId: text("subscription_id")
            .notNull()
            .references(() => pushSubscription.id, { onDelete: "cascade" }),
        localDate: date("local_date", { mode: "string" }).notNull(),
        claimedAt: timestamp("claimed_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
        sentAt: timestamp("sent_at", { withTimezone: true }),
    },
    (table) => [
        primaryKey({ columns: [table.subscriptionId, table.localDate] }),
    ],
);
