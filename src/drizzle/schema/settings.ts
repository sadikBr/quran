import { relations } from "drizzle-orm";
import { boolean, pgEnum, pgTable, text } from "drizzle-orm/pg-core";
import { READING_MODES, THEMES } from "@/features/settings/preferences";
import { createdAt, updatedAt } from "../helpers";
import { user } from "./auth-schema";

export const Theme = pgEnum("theme", THEMES);
export const ReadingMode = pgEnum("reading_mode", READING_MODES);

export const userSettings = pgTable("user_settings", {
    userId: text("user_id")
        .primaryKey()
        .references(() => user.id, { onDelete: "cascade" }),

    theme: Theme("theme").notNull().default("system"),
    arabicEdition: text("arabic_edition").notNull().default("quran-simple"),
    translationEdition: text("translation_edition")
        .notNull()
        .default("en.sahih"),
    tafsirEdition: text("tafsir_edition").notNull().default("ar.muyassar"),
    showTranslation: boolean("show_translation").notNull().default(false),
    readingMode: ReadingMode("reading_mode").notNull().default("page"),

    createdAt,
    updatedAt,
});

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
    user: one(user, {
        fields: [userSettings.userId],
        references: [user.id],
    }),
}));
