import { relations } from "drizzle-orm";
import {
    date,
    index,
    integer,
    pgTable,
    text,
    timestamp,
    uniqueIndex,
} from "drizzle-orm/pg-core";
import { createdAt } from "../helpers";
import { user } from "./auth-schema";

export const userWirdHistory = pgTable(
    "user_wird_history",
    {
        id: text("id").primaryKey(),
        userId: text("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        unit: text("unit").notNull(),
        amount: integer("amount").notNull(),
        targetStartGlobalAyah: integer("target_start_global_ayah").notNull(),
        targetEndGlobalAyah: integer("target_end_global_ayah").notNull(),
        targetDate: date("target_date", { mode: "string" }).notNull(),
        completedAt: timestamp("completed_at", {
            withTimezone: true,
        }).notNull(),
        createdAt,
    },
    (table) => [
        index("user_wird_history_user_idx").on(table.userId),
        uniqueIndex("user_wird_history_target_idx").on(
            table.userId,
            table.targetDate,
            table.targetStartGlobalAyah,
        ),
    ],
);

export const userWirdHistoryRelations = relations(
    userWirdHistory,
    ({ one }) => ({
        user: one(user, {
            fields: [userWirdHistory.userId],
            references: [user.id],
        }),
    }),
);
