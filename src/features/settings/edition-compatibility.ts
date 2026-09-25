import type { Edition, Reciter } from "@/features/quran/types";
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
    reciter: Reciter,
    readingMode: ReadingMode,
) {
    return (
        reciter.scope === "ayah" ||
        (readingMode === "surah" && reciter.scope === "surah")
    );
}

export function normalizeEditionPreferences(
    preferences: Preferences,
    editions: Edition[],
    reciters: Reciter[],
): Preferences {
    const arabicEdition = editions.find(
        (edition) => edition.identifier === preferences.arabicEdition,
    );
    const reciter = reciters.find((item) => item.id === preferences.reciter);
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
            reciter && isReciterCompatible(reciter, preferences.readingMode)
                ? reciter.id
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
    reciters: Reciter[],
) {
    const normalized = normalizeEditionPreferences(
        preferences,
        editions,
        reciters,
    );

    return (
        normalized.arabicEdition === preferences.arabicEdition &&
        normalized.reciter === preferences.reciter &&
        normalized.translationEdition === preferences.translationEdition &&
        normalized.tafsirEdition === preferences.tafsirEdition
    );
}
