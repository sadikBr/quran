import z from "zod";

export const THEMES = ["system", "light", "dark"] as const;
export const READING_MODES = ["page", "surah"] as const;
export const RIWAYAHS = ["hafs", "warsh"] as const;

export type Theme = (typeof THEMES)[number];
export type ReadingMode = (typeof READING_MODES)[number];
export type Riwayah = (typeof RIWAYAHS)[number];

export interface Preferences {
    theme: Theme;
    riwayah: Riwayah;
    arabicEdition: string;
    reciter: string;
    translationEdition: string;
    tafsirEdition: string;
    showTranslation: boolean;
    readingMode: ReadingMode;
    continuousRecitation: boolean;
}

export const DEFAULT_PREFERENCES: Preferences = {
    theme: "light",
    riwayah: "hafs",
    arabicEdition: "quran-simple",
    reciter: "everyayah/Alafasy_64kbps",
    translationEdition: "en.sahih",
    tafsirEdition: "ar.muyassar",
    showTranslation: false,
    readingMode: "page",
    continuousRecitation: false,
};

export const preferencesZodSchema = z.object({
    theme: z.enum(THEMES),
    riwayah: z.enum(RIWAYAHS),
    arabicEdition: z.string().min(1),
    reciter: z.string().min(1),
    translationEdition: z.string().min(1),
    tafsirEdition: z.string().min(1),
    showTranslation: z.boolean(),
    readingMode: z.enum(READING_MODES),
    continuousRecitation: z.boolean(),
});
