import z from "zod";

export const THEMES = ["system", "light", "dark"] as const;
export const READING_MODES = ["page", "surah"] as const;

export type Theme = (typeof THEMES)[number];
export type ReadingMode = (typeof READING_MODES)[number];

export interface Preferences {
    theme: Theme;
    arabicEdition: string;
    translationEdition: string;
    showTranslation: boolean;
    readingMode: ReadingMode;
}

export const DEFAULT_PREFERENCES: Preferences = {
    theme: "light",
    arabicEdition: "quran-simple",
    translationEdition: "en.sahih",
    showTranslation: false,
    readingMode: "page",
};

export const preferencesZodSchema = z.object({
    theme: z.enum(THEMES),
    arabicEdition: z.string().min(1),
    translationEdition: z.string().min(1),
    showTranslation: z.boolean(),
    readingMode: z.enum(READING_MODES),
});
