"use server";

import { headers } from "next/headers";
import { auth } from "@/features/auth/auth";
import getSavedAyah from "@/features/saved-ayahs/server/get-saved-ayah";
import type { Riwayah } from "@/features/settings/preferences";
import getPreferences from "@/features/settings/server/get-preferences";
import type { AyahActionsProps } from "../components/ayah-actions";
import { getPlainQuranText } from "../components/tajweed-text";
import { stripBasmalaPrefix } from "../helpers/basmala";
import getRecitationStreams from "../helpers/get-recitation-streams";
import {
    getWarshAudioAyahNumbers,
    getWarshHafsAnchor,
    usesNativeWarshAyahNumbering,
} from "../helpers/map-warsh-ayahs";
import getAvailableReciters from "./get-available-reciter";
import getAyah from "./get-ayah";
import getAvailableQuranEditions from "./get-quran-edition";
import getSurahData from "./get-surah";
import getWarshChapter from "./get-warsh-chapter";

export type AyahActionsData = Omit<
    AyahActionsProps,
    "closeOnCopy" | "onSavedAyahChange"
>;

export default async function getAyahActionsData(
    surahNumber: number,
    ayahNumber: number,
    riwayahOverride?: Riwayah,
): Promise<AyahActionsData | null> {
    const [preferences, session] = await Promise.all([
        getPreferences(),
        auth.api.getSession({ headers: await headers() }),
    ]);
    const riwayah = riwayahOverride ?? preferences.riwayah;
    const [{ ayahs, surahMeta }, { reciters }, warshChapter] =
        await Promise.all([
            getSurahData(String(surahNumber), preferences.arabicEdition),
            getAvailableReciters(),
            riwayah === "warsh"
                ? getWarshChapter(surahNumber)
                : Promise.resolve(null),
        ]);
    const warshVerse = warshChapter?.verses.find(
        (verse) => verse.number === ayahNumber,
    );
    const reciter = reciters.find((item) => item.id === preferences.reciter);
    const nativeWarshAudio = usesNativeWarshAyahNumbering(reciter);
    const hafsAyahNumber = warshVerse
        ? getWarshHafsAnchor(warshVerse, surahNumber)
        : ayahNumber;
    const audioAyahNumber = warshVerse
        ? nativeWarshAudio
            ? warshVerse.number
            : getWarshAudioAyahNumbers(warshVerse, surahNumber)[0]
        : ayahNumber;
    const ayah = ayahs.find((item) => item.numberInSurah === hafsAyahNumber);
    if (!ayah) return null;

    const arabicText = warshVerse
        ? warshVerse.text
        : ayah.numberInSurah === 1 && surahNumber !== 1
          ? stripBasmalaPrefix(ayah.text)
          : ayah.text;
    const canonicalArabicText =
        ayah.numberInSurah === 1 && surahNumber !== 1
            ? stripBasmalaPrefix(ayah.text)
            : ayah.text;

    const [tafsirAyah, tafsirEditions, savedAyah] = await Promise.all([
        getAyah(ayah.number),
        session
            ? getAvailableQuranEditions().then((editions) =>
                  editions.filter((edition) => edition.type === "tafsir"),
              )
            : [],
        session ? getSavedAyah(session.user.id, ayah.number) : null,
    ]);
    const savedWarshVerse =
        savedAyah && warshChapter
            ? warshChapter.verses.find(
                  (verse) =>
                      verse.number === savedAyah.ayahNumber &&
                      verse.number_in_hafs.includes(ayah.numberInSurah),
              )
            : null;
    const defaultWarshVerse = warshChapter?.verses.find((verse) =>
        verse.number_in_hafs.includes(ayah.numberInSurah),
    );
    const resolvedSavedAyah = warshVerse
        ? (savedWarshVerse ?? defaultWarshVerse)?.number === warshVerse.number
            ? savedAyah
            : null
        : savedAyah;

    return {
        surahName: surahMeta.englishName,
        ayahNumber,
        arabicText,
        tafsirText: tafsirAyah.text,
        tafsirEditionName:
            preferences.language === "ar"
                ? tafsirAyah.edition.name || tafsirAyah.edition.englishName
                : tafsirAyah.edition.englishName || tafsirAyah.edition.name,
        tafsirEditionIdentifier: tafsirAyah.edition.identifier,
        tafsirDirection: tafsirAyah.edition.direction,
        audioStreams:
            reciter?.scope === "ayah"
                ? getRecitationStreams(reciter, {
                      surahNumber,
                      ayahNumber: audioAyahNumber,
                      globalAyahNumber: ayah.number,
                  })
                : [],
        globalAyahNumber: ayah.number,
        surahNumber,
        tafsirEditions,
        canChooseTafsir: Boolean(session),
        canSaveAyah: Boolean(session),
        initialBookmarked: resolvedSavedAyah?.isBookmarked ?? false,
        initialReflection: resolvedSavedAyah?.reflection ?? "",
        savedAyahMetadata: {
            globalAyahNumber: ayah.number,
            surahNumber,
            // Preserve the displayed number as provenance. More than one
            // Warsh ayah can share the same canonical Hafs anchor.
            ayahNumber,
            pageNumber: ayah.page,
            surahName: surahMeta.englishName,
            arabicText: getPlainQuranText(canonicalArabicText),
        },
    };
}
