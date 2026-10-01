import z from "zod";

export const THEMES = [
    "system",
    "light",
    "dark",
    "emerald",
    "sapphire",
    "rose",
    "aurora",
    "pearl",
    "ruby",
    "olive",
    "obsidian",
    "lagoon",
    "wisteria",
    "apricot",
    "copper",
    "celadon",
] as const;
export const LANGUAGES = ["en", "ar"] as const;
export const READING_MODES = ["page", "surah"] as const;
export const RIWAYAHS = ["hafs", "warsh"] as const;
export const ARABIC_TEXT_SIZES = [1, 2, 3, 4, 5] as const;

export type Theme = (typeof THEMES)[number];
export type Language = (typeof LANGUAGES)[number];
export type ReadingMode = (typeof READING_MODES)[number];
export type Riwayah = (typeof RIWAYAHS)[number];
export type ArabicTextSize = (typeof ARABIC_TEXT_SIZES)[number];

export interface Preferences {
    keepScreenAwake: boolean;
    vibration: "off" | "gentle" | "strong";
    morningAdhkarTime: string | null;
    eveningAdhkarTime: string | null;
    sleepAdhkarTime: string | null;
    adhkarTimezone: string;
    theme: Theme;
    language: Language;
    riwayah: Riwayah;
    arabicEdition: string;
    reciter: string;
    translationEdition: string;
    tafsirEdition: string;
    showTranslation: boolean;
    readingMode: ReadingMode;
    continuousRecitation: boolean;
    arabicTextSize: ArabicTextSize;
    wirdRemindersEnabled: boolean;
    meetingRemindersEnabled: boolean;
    assignmentRemindersEnabled: boolean;
}

export const DEFAULT_PREFERENCES: Preferences = {
    keepScreenAwake: false,
    vibration: "off",
    morningAdhkarTime: null,
    eveningAdhkarTime: null,
    sleepAdhkarTime: null,
    adhkarTimezone: "Africa/Casablanca",
    theme: "light",
    language: "ar",
    riwayah: "hafs",
    arabicEdition: "quran-simple",
    reciter: "quranpedia/255",
    translationEdition: "en.sahih",
    tafsirEdition: "ar.muyassar",
    showTranslation: false,
    readingMode: "page",
    continuousRecitation: false,
    arabicTextSize: 3,
    wirdRemindersEnabled: true,
    meetingRemindersEnabled: true,
    assignmentRemindersEnabled: true,
};

export const preferencesZodSchema = z.object({
    keepScreenAwake: z.boolean().default(false),
    vibration: z.enum(["off", "gentle", "strong"]).default("off"),
    morningAdhkarTime: z
        .string()
        .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
        .nullable()
        .default(null),
    sleepAdhkarTime: z
        .string()
        .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
        .nullable()
        .default(null),
    eveningAdhkarTime: z
        .string()
        .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
        .nullable()
        .default(null),
    adhkarTimezone: z
        .string()
        .max(100)
        .refine((zone) => {
            try {
                new Intl.DateTimeFormat("en", { timeZone: zone });
                return true;
            } catch {
                return false;
            }
        })
        .default("Africa/Casablanca"),
    theme: z.enum(THEMES),
    language: z.enum(LANGUAGES),
    riwayah: z.enum(RIWAYAHS),
    arabicEdition: z.string().min(1),
    reciter: z.string().min(1),
    translationEdition: z.string().min(1),
    tafsirEdition: z.string().min(1),
    showTranslation: z.boolean(),
    readingMode: z.enum(READING_MODES),
    continuousRecitation: z.boolean(),
    wirdRemindersEnabled: z.boolean(),
    meetingRemindersEnabled: z.boolean(),
    assignmentRemindersEnabled: z.boolean(),
    arabicTextSize: z.union([
        z.literal(1),
        z.literal(2),
        z.literal(3),
        z.literal(4),
        z.literal(5),
    ]),
});
