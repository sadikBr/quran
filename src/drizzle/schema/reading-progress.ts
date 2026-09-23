import { relations } from "drizzle-orm";
import { integer, pgTable, text } from "drizzle-orm/pg-core";
import { createdAt, updatedAt } from "../helpers";
import { user } from "./auth-schema";

export const userReadingProgress = pgTable("user_reading_progress", {
    userId: text("user_id")
        .primaryKey()
        .references(() => user.id, { onDelete: "cascade" }),

    lastPageNumber: integer("last_page_number"),
    lastSurahNumber: integer("last_surah_number"),

    createdAt,
    updatedAt,
});

export const userReadingProgressRelations = relations(
    userReadingProgress,
    ({ one }) => ({
        user: one(user, {
            fields: [userReadingProgress.userId],
            references: [user.id],
        }),
    }),
);
