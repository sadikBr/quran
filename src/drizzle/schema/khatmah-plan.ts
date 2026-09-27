import { relations, sql } from "drizzle-orm";
import {
    boolean,
    date,
    integer,
    pgTable,
    text,
    timestamp,
} from "drizzle-orm/pg-core";
import { createdAt, updatedAt } from "../helpers";
import { user } from "./auth-schema";

export const userKhatmahPlan = pgTable("user_khatmah_plan", {
    userId: text("user_id")
        .primaryKey()
        .references(() => user.id, { onDelete: "cascade" }),
    targetDate: date("target_date", { mode: "string" }).notNull(),
    durationWeeks: integer("duration_weeks").notNull().default(8),
    repeatable: boolean("repeatable").notNull().default(false),
    cycleStartedOn: date("cycle_started_on", { mode: "string" })
        .notNull()
        .default(sql`CURRENT_DATE`),
    cycleReadingDays: integer("cycle_reading_days").notNull().default(0),
    startGlobalAyah: integer("start_global_ayah").notNull(),
    currentGlobalAyah: integer("current_global_ayah").notNull(),
    measurement: text("measurement").notNull(),
    restDays: integer("rest_days")
        .array()
        .notNull()
        .default(sql`'{}'::integer[]`),
    isActive: boolean("is_active").notNull().default(true),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt,
    updatedAt,
});

export const userKhatmahPlanRelations = relations(
    userKhatmahPlan,
    ({ one }) => ({
        user: one(user, {
            fields: [userKhatmahPlan.userId],
            references: [user.id],
        }),
    }),
);
