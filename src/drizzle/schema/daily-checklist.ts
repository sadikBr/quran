import {
    boolean,
    date,
    integer,
    jsonb,
    pgTable,
    primaryKey,
    text,
} from "drizzle-orm/pg-core";
import type {
    ChecklistChoice,
    DailyAdhkarCategory,
} from "@/features/plans/daily-checklist";
import { user } from "./auth-schema";

export const dailyChecklistSettings = pgTable("daily_checklist_settings", {
    userId: text("user_id")
        .primaryKey()
        .references(() => user.id, { onDelete: "cascade" }),
    visible: jsonb("visible").$type<ChecklistChoice[]>().notNull(),
    revision: integer("revision").notNull().default(1),
});

export const dailyAdhkarCompletion = pgTable(
    "daily_adhkar_completion",
    {
        userId: text("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        localDate: date("local_date", { mode: "string" }).notNull(),
        category: text("category", { enum: ["morning", "evening", "sleep"] })
            .$type<DailyAdhkarCategory>()
            .notNull(),
        completed: boolean("completed").notNull().default(false),
        revision: integer("revision").notNull().default(1),
    },
    (table) => [
        primaryKey({
            columns: [table.userId, table.localDate, table.category],
        }),
    ],
);
