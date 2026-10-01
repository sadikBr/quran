import type { Edition, Reciter } from "@/features/quran/types";
import {
    DEFAULT_PREFERENCES,
    type Preferences,
    type ReadingMode,
    type Riwayah,
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
    riwayah: Riwayah,
) {
    const metadata = `${reciter.id} ${reciter.name} ${reciter.recitation ?? ""}`;
    const isWarshReciter = /(?:^|[\s/(_-])warsh(?:$|[\s/)_-])/i.test(metadata);
    const isHafsReciter = reciter.recitation
        ? /(?:^|[\s/(_-])hafs(?:$|[\s/)_'-])/i.test(reciter.recitation)
        : !isWarshReciter;

    return (
        (riwayah === "warsh" ? isWarshReciter : isHafsReciter) &&
        (reciter.scope === "ayah" ||
            (readingMode === "surah" && reciter.scope === "surah"))
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
    const compatibleReciters = reciters.filter((item) =>
        isReciterCompatible(item, preferences.readingMode, preferences.riwayah),
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
            arabicEdition && isArabicTextEditionCompatible(arabicEdition)
                ? arabicEdition.identifier
                : DEFAULT_PREFERENCES.arabicEdition,
        reciter:
            reciter &&
            isReciterCompatible(
                reciter,
                preferences.readingMode,
                preferences.riwayah,
            )
                ? reciter.id
                : (compatibleReciters.find(
                      (item) =>
                          item.id ===
                          (preferences.riwayah === "warsh"
                              ? "quranpedia/263"
                              : DEFAULT_PREFERENCES.reciter),
                  )?.id ??
                  compatibleReciters[0]?.id ??
                  DEFAULT_PREFERENCES.reciter),
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
