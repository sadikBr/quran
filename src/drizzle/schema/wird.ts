import { relations } from "drizzle-orm";
import {
    date,
    integer,
    jsonb,
    pgTable,
    text,
    timestamp,
} from "drizzle-orm/pg-core";
import { createdAt, updatedAt } from "../helpers";
import { user } from "./auth-schema";

export const userWird = pgTable("user_wird", {
    userId: text("user_id")
        .primaryKey()
        .references(() => user.id, { onDelete: "cascade" }),
    unit: text("unit").notNull(),
    amount: integer("amount").notNull(),
    targetStartGlobalAyah: integer("target_start_global_ayah").notNull(),
    targetEndGlobalAyah: integer("target_end_global_ayah").notNull(),
    progressGlobalAyah: integer("progress_global_ayah"),
    progressVerse: jsonb("progress_verse").$type<{
        riwayah: "hafs" | "warsh";
        surahNumber: number;
        ayahNumber: number;
    }>(),
    nextGoal: jsonb("next_goal").$type<{ unit: string; amount: number }>(),
    targetDate: date("target_date", { mode: "string" }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt,
    updatedAt,
});

export const userWirdRelations = relations(userWird, ({ one }) => ({
    user: one(user, {
        fields: [userWird.userId],
        references: [user.id],
    }),
}));
