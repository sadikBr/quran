import { relations } from "drizzle-orm";
import { boolean, integer, pgEnum, pgTable, text } from "drizzle-orm/pg-core";
import {
    LANGUAGES,
    READING_MODES,
    RIWAYAHS,
    THEMES,
} from "@/features/settings/preferences";
import { createdAt, updatedAt } from "../helpers";
import { user } from "./auth-schema";

export const Theme = pgEnum("theme", THEMES);
export const Language = pgEnum("language", LANGUAGES);
export const ReadingMode = pgEnum("reading_mode", READING_MODES);
export const Riwayah = pgEnum("riwayah", RIWAYAHS);
export const Vibration = pgEnum("vibration", ["off", "gentle", "strong"]);

export const userSettings = pgTable("user_settings", {
    keepScreenAwake: boolean("keep_screen_awake").notNull().default(false),
    vibration: Vibration("vibration").notNull().default("off"),
    morningAdhkarTime: text("morning_adhkar_time"),
    eveningAdhkarTime: text("evening_adhkar_time"),
    sleepAdhkarTime: text("sleep_adhkar_time"),
    adhkarTimezone: text("adhkar_timezone")
        .notNull()
        .default("Africa/Casablanca"),
    userId: text("user_id")
        .primaryKey()
        .references(() => user.id, { onDelete: "cascade" }),

    theme: Theme("theme").notNull().default("system"),
    language: Language("language").notNull().default("ar"),
    riwayah: Riwayah("riwayah").notNull().default("hafs"),
    arabicEdition: text("arabic_edition")
        .notNull()
        .default("quranpedia.mushaf.1"),
    reciter: text("reciter").notNull().default("quranpedia/255"),
    translationEdition: text("translation_edition")
        .notNull()
        .default("quranpedia.translation.13638"),
    tafsirEdition: text("tafsir_edition")
        .notNull()
        .default("quranpedia.tafsir.2012"),
    showTranslation: boolean("show_translation").notNull().default(false),
    readingMode: ReadingMode("reading_mode").notNull().default("page"),
    continuousRecitation: boolean("continuous_recitation")
        .notNull()
        .default(false),
    arabicTextSize: integer("arabic_text_size").notNull().default(3),
    wirdRemindersEnabled: boolean("wird_reminders_enabled")
        .notNull()
        .default(true),
    meetingRemindersEnabled: boolean("meeting_reminders_enabled")
        .notNull()
        .default(true),
    assignmentRemindersEnabled: boolean("assignment_reminders_enabled")
        .notNull()
        .default(true),

    createdAt,
    updatedAt,
});

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
    user: one(user, {
        fields: [userSettings.userId],
        references: [user.id],
    }),
}));
