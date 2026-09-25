import type { Edition } from "@/features/quran/types";
import {
    DEFAULT_PREFERENCES,
    type Preferences,
    type ReadingMode,
} from "./preferences";

export function isArabicTextEditionCompatible(edition: Edition) {
    return (
        edition.language === "ar" &&
        edition.format === "text" &&
        edition.type === "quran"
    );
}

export function isReciterCompatible(
    edition: Edition,
    readingMode: ReadingMode,
) {
    return (
        edition.language === "ar" &&
        edition.format === "audio" &&
        (edition.type === "versebyverse" ||
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
    const reciter = editions.find(
        (edition) => edition.identifier === preferences.reciter,
    );
    const preferredReciter =
        arabicEdition &&
        isReciterCompatible(arabicEdition, preferences.readingMode)
            ? arabicEdition
            : reciter;
    const translationEdition = editions.find(
        (edition) => edition.identifier === preferences.translationEdition,
    );
    const tafsirEdition = editions.find(
        (edition) => edition.identifier === preferences.tafsirEdition,
    );

    return {
        ...preferences,
        arabicEdition:
            arabicEdition && isArabicTextEditionCompatible(arabicEdition)
                ? arabicEdition.identifier
                : DEFAULT_PREFERENCES.arabicEdition,
        reciter:
            preferredReciter &&
            isReciterCompatible(preferredReciter, preferences.readingMode)
                ? preferredReciter.identifier
                : DEFAULT_PREFERENCES.reciter,
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
        normalized.reciter === preferences.reciter &&
        normalized.translationEdition === preferences.translationEdition &&
        normalized.tafsirEdition === preferences.tafsirEdition
    );
}
