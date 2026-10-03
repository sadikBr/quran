import { sql } from "drizzle-orm";
import {
    boolean,
    check,
    date,
    integer,
    jsonb,
    pgTable,
    text,
    timestamp,
    uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

export const learningSchedule = pgTable("learning_schedule", {
    userId: text("user_id")
        .primaryKey()
        .references(() => user.id, { onDelete: "cascade" }),
    revisionDays: jsonb("revision_days").$type<number[]>().notNull(),
    memorizationDays: jsonb("memorization_days").$type<number[]>().notNull(),
    revision: integer("revision").notNull().default(1),
});
export const memorizationPlan = pgTable(
    "memorization_plan",
    {
        userId: text("user_id")
            .primaryKey()
            .references(() => user.id, { onDelete: "cascade" }),
        enabled: boolean("enabled").notNull().default(true),
        quartersPerWeek: integer("quarters_per_week").notNull(),
        startQuarter: integer("start_quarter").notNull(),
        direction: text("direction", {
            enum: ["forward", "backward"],
        }).notNull(),
        timezone: text("timezone").notNull(),
        riwayah: text("riwayah", { enum: ["hafs", "warsh"] }).notNull(),
        revision: integer("revision").notNull().default(1),
    },
    (t) => [
        check(
            "memorization_plan_amount_check",
            sql`${t.quartersPerWeek} between 1 and 28`,
        ),
        check(
            "memorization_plan_start_check",
            sql`${t.startQuarter} between 1 and 240`,
        ),
    ],
);
export const memorizationWeek = pgTable(
    "memorization_week",
    {
        id: text("id").primaryKey(),
        userId: text("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        weekStart: date("week_start", { mode: "string" }).notNull(),
        timezone: text("timezone").notNull(),
        riwayah: text("riwayah", { enum: ["hafs", "warsh"] }).notNull(),
        days: jsonb("days").$type<number[]>().notNull(),
        quartersPerWeek: integer("quarters_per_week").notNull(),
    },
    (t) => [
        uniqueIndex("memorization_week_user_date_idx").on(
            t.userId,
            t.weekStart,
        ),
    ],
);
export const memorizationSession = pgTable(
    "memorization_session",
    {
        id: text("id").primaryKey(),
        weekId: text("week_id")
            .notNull()
            .references(() => memorizationWeek.id, { onDelete: "cascade" }),
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
        completedAt: timestamp("completed_at", { withTimezone: true }),
    },
    (t) => [
        uniqueIndex("memorization_session_week_order_idx").on(
            t.weekId,
            t.ordinal,
        ),
    ],
);
