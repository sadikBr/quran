import { relations } from "drizzle-orm";
import {
    boolean,
    index,
    integer,
    pgTable,
    primaryKey,
    text,
} from "drizzle-orm/pg-core";
import { createdAt, updatedAt } from "../helpers";
import { user } from "./auth-schema";

export const savedAyah = pgTable(
    "saved_ayah",
    {
        userId: text("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        globalAyahNumber: integer("global_ayah_number").notNull(),
        surahNumber: integer("surah_number").notNull(),
        ayahNumber: integer("ayah_number").notNull(),
        pageNumber: integer("page_number").notNull(),
        surahName: text("surah_name").notNull(),
        arabicText: text("arabic_text").notNull(),
        isBookmarked: boolean("is_bookmarked").notNull().default(false),
        reflection: text("reflection"),
        createdAt,
        updatedAt,
    },
    (table) => [
        primaryKey({ columns: [table.userId, table.globalAyahNumber] }),
        index("saved_ayah_user_id_idx").on(table.userId),
        index("saved_ayah_user_surah_idx").on(table.userId, table.surahNumber),
    ],
);

export const savedAyahRelations = relations(savedAyah, ({ one }) => ({
    user: one(user, {
        fields: [savedAyah.userId],
        references: [user.id],
    }),
}));
