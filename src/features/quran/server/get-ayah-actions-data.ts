"use server";

import { headers } from "next/headers";
import { auth } from "@/features/auth/auth";
import getSavedAyah from "@/features/saved-ayahs/server/get-saved-ayah";
import getPreferences from "@/features/settings/server/get-preferences";
import type { AyahActionsProps } from "../components/ayah-actions";
import { getPlainQuranText } from "../components/tajweed-text";
import { stripBasmalaPrefix } from "../helpers/basmala";
import getRecitationStreams from "../helpers/get-recitation-streams";
import { getWarshHafsAnchor } from "../helpers/map-warsh-ayahs";
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
): Promise<AyahActionsData | null> {
    const [preferences, session] = await Promise.all([
        getPreferences(),
        auth.api.getSession({ headers: await headers() }),
    ]);
    const [{ ayahs, surahMeta }, { reciters }, warshChapter] =
        await Promise.all([
            getSurahData(String(surahNumber), preferences.arabicEdition),
            getAvailableReciters(),
            preferences.riwayah === "warsh"
                ? getWarshChapter(surahNumber)
                : Promise.resolve(null),
        ]);
    const warshVerse = warshChapter?.verses.find(
        (verse) => verse.id === ayahNumber,
    );
    const hafsAyahNumber = warshVerse
        ? getWarshHafsAnchor(warshVerse, surahNumber)
        : ayahNumber;
    const ayah = ayahs.find((item) => item.numberInSurah === hafsAyahNumber);
    const reciter = reciters.find((item) => item.id === preferences.reciter);

    if (!ayah) return null;

    const arabicText = warshVerse
        ? warshVerse.text
        : ayah.numberInSurah === 1 && surahNumber !== 1
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

    return {
        surahName: surahMeta.englishName,
        ayahNumber,
        arabicText,
        tafsirText: tafsirAyah.text,
        tafsirEditionName:
            tafsirAyah.edition.englishName || tafsirAyah.edition.name,
        tafsirEditionIdentifier: tafsirAyah.edition.identifier,
        tafsirDirection: tafsirAyah.edition.direction,
        audioStreams:
            reciter?.scope === "ayah"
                ? getRecitationStreams(reciter, {
                      surahNumber,
                      ayahNumber,
                      globalAyahNumber: ayah.number,
                  })
                : [],
        globalAyahNumber: ayah.number,
        surahNumber,
        pageNumber: ayah.page,
        tafsirEditions,
        canChooseTafsir: Boolean(session),
        canSaveAyah: Boolean(session),
        initialBookmarked: savedAyah?.isBookmarked ?? false,
        initialReflection: savedAyah?.reflection ?? "",
        plainArabicText: getPlainQuranText(arabicText),
    };
}
