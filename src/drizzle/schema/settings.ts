import { relations } from "drizzle-orm";
import { boolean, pgEnum, pgTable, text } from "drizzle-orm/pg-core";

import { createdAt, updatedAt } from "../helpers";
import { user } from "./auth-schema";
import { THEMES } from "@/features/settings/preferences";

export const Theme = pgEnum("theme", THEMES);

export const userSettings = pgTable("user_settings", {
    userId: text("user_id")
        .primaryKey()
        .references(() => user.id, { onDelete: "cascade" }),

    theme: Theme("theme").notNull().default("system"),
    arabicEdition: text("arabic_edition").notNull().default("quran-simple"),
    translationEdition: text("translation_edition")
        .notNull()
        .default("en.sahih"),
    showTranslation: boolean("show_translation").notNull().default(false),

    createdAt,
    updatedAt,
});

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
    user: one(user, {
        fields: [userSettings.userId],
        references: [user.id],
    }),
}));
