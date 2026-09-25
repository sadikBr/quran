"use server";

import { headers } from "next/headers";
import { auth } from "@/features/auth/auth";
import getSavedAyah from "@/features/saved-ayahs/server/get-saved-ayah";
import getPreferences from "@/features/settings/server/get-preferences";
import type { AyahActionsProps } from "../components/ayah-actions";
import { getPlainQuranText } from "../components/tajweed-text";
import { stripBasmalaPrefix } from "../helpers/basmala";
import getAyahAudioStreams from "../helpers/get-ayah-audio-streams";
import getAyah from "./get-ayah";
import getAvailableQuranEditions from "./get-quran-edition";
import getSurahData from "./get-surah";

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
    const [textSurah, audioSurah] = await Promise.all([
        getSurahData(String(surahNumber), preferences.arabicEdition),
        getSurahData(String(surahNumber), preferences.reciter),
    ]);
    const { ayahs, surahMeta } = textSurah;
    const ayah = ayahs.find((item) => item.numberInSurah === ayahNumber);
    const audioAyah = audioSurah.ayahs.find(
        (item) => item.numberInSurah === ayahNumber,
    );

    if (!ayah) return null;

    const arabicText =
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

    return {
        surahName: surahMeta.englishName,
        ayahNumber,
        arabicText,
        tafsirText: tafsirAyah.text,
        tafsirEditionName:
            tafsirAyah.edition.englishName || tafsirAyah.edition.name,
        tafsirEditionIdentifier: tafsirAyah.edition.identifier,
        tafsirDirection: tafsirAyah.edition.direction,
        audioStreams: audioAyah ? getAyahAudioStreams(audioAyah) : [],
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
