import z from "zod";

export const THEMES = ["system", "light", "dark"] as const;
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
    theme: "light",
    language: "en",
    riwayah: "hafs",
    arabicEdition: "quran-simple",
    reciter: "everyayah/Alafasy_64kbps",
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
