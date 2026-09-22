export const THEMES = ["system", "light", "dark"] as const;

export type Theme = (typeof THEMES)[number];

export interface Preferences {
    theme: Theme;
    arabicEdition: string;
    translationEdition: string;
    showTranslation: boolean;
}

export const DEFAULT_PREFERENCES: Preferences = {
    theme: "light",
    arabicEdition: "quran-simple",
    translationEdition: "en.sahih",
    showTranslation: false,
};
