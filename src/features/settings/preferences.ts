import z from "zod";

export const THEMES = ["system", "light", "dark"] as const;
export const READING_MODES = ["page", "surah"] as const;

export type Theme = (typeof THEMES)[number];
export type ReadingMode = (typeof READING_MODES)[number];

export interface Preferences {
    theme: Theme;
    arabicEdition: string;
    translationEdition: string;
    tafsirEdition: string;
    showTranslation: boolean;
    readingMode: ReadingMode;
    continuousRecitation: boolean;
}

export const DEFAULT_PREFERENCES: Preferences = {
    theme: "light",
    arabicEdition: "quran-simple",
    translationEdition: "en.sahih",
    tafsirEdition: "ar.muyassar",
    showTranslation: false,
    readingMode: "page",
    continuousRecitation: false,
};

export const preferencesZodSchema = z.object({
    theme: z.enum(THEMES),
    arabicEdition: z.string().min(1),
    translationEdition: z.string().min(1),
    tafsirEdition: z.string().min(1),
    showTranslation: z.boolean(),
    readingMode: z.enum(READING_MODES),
    continuousRecitation: z.boolean(),
});
