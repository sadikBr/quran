import { relations } from "drizzle-orm";
import { date, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
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
