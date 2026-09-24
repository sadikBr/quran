import type { Edition } from "@/features/quran/types";
import {
    DEFAULT_PREFERENCES,
    type Preferences,
    type ReadingMode,
} from "./preferences";

export function isArabicEditionCompatible(
    edition: Edition,
    readingMode: ReadingMode,
) {
    return (
        edition.language === "ar" &&
        (edition.type === "quran" ||
            edition.type === "versebyverse" ||
            (readingMode === "surah" && edition.type === "surahbysurah"))
    );
}

export function normalizeEditionPreferences(
    preferences: Preferences,
    editions: Edition[],
): Preferences {
    const arabicEdition = editions.find(
        (edition) => edition.identifier === preferences.arabicEdition,
    );
    const translationEdition = editions.find(
        (edition) => edition.identifier === preferences.translationEdition,
    );
    const tafsirEdition = editions.find(
        (edition) => edition.identifier === preferences.tafsirEdition,
    );

    return {
        ...preferences,
        arabicEdition:
            arabicEdition &&
            isArabicEditionCompatible(arabicEdition, preferences.readingMode)
                ? arabicEdition.identifier
                : DEFAULT_PREFERENCES.arabicEdition,
        translationEdition:
            translationEdition?.type === "translation" &&
            translationEdition.language === "en"
                ? translationEdition.identifier
                : DEFAULT_PREFERENCES.translationEdition,
        tafsirEdition:
            tafsirEdition?.type === "tafsir"
                ? tafsirEdition.identifier
                : DEFAULT_PREFERENCES.tafsirEdition,
    };
}

export function areEditionsCompatible(
    preferences: Preferences,
    editions: Edition[],
) {
    const normalized = normalizeEditionPreferences(preferences, editions);

    return (
        normalized.arabicEdition === preferences.arabicEdition &&
        normalized.translationEdition === preferences.translationEdition &&
        normalized.tafsirEdition === preferences.tafsirEdition
    );
}
