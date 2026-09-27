import { relations } from "drizzle-orm";
import {
    boolean,
    date,
    index,
    integer,
    pgTable,
    text,
    timestamp,
} from "drizzle-orm/pg-core";
import { createdAt } from "../helpers";
import { user } from "./auth-schema";

export const userKhatmahHistory = pgTable(
    "user_khatmah_history",
    {
        id: text("id").primaryKey(),
        userId: text("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        startedOn: date("started_on", { mode: "string" }).notNull(),
        completedAt: timestamp("completed_at", {
            withTimezone: true,
        }).notNull(),
        plannedWeeks: integer("planned_weeks").notNull(),
        actualDays: integer("actual_days").notNull(),
        readingDays: integer("reading_days").notNull(),
        measurement: text("measurement").notNull(),
        startedGlobalAyah: integer("started_global_ayah").notNull(),
        wasRepeatable: boolean("was_repeatable").notNull().default(false),
        createdAt,
    },
    (table) => [
        index("user_khatmah_history_user_idx").on(table.userId),
        index("user_khatmah_history_completed_idx").on(table.completedAt),
    ],
);

export const userKhatmahHistoryRelations = relations(
    userKhatmahHistory,
    ({ one }) => ({
        user: one(user, {
            fields: [userKhatmahHistory.userId],
            references: [user.id],
        }),
    }),
);
