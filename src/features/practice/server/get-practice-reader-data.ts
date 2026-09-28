import "server-only";

import getRecitationStreams from "@/features/quran/helpers/get-recitation-streams";
import mapWarshAyahs, {
    getWarshAudioAyahNumbers,
    usesNativeWarshAyahNumbering,
} from "@/features/quran/helpers/map-warsh-ayahs";
import getAvailableReciters from "@/features/quran/server/get-available-reciter";
import getSurahData from "@/features/quran/server/get-surah";
import getWarshChapter from "@/features/quran/server/get-warsh-chapter";
import type { Preferences } from "@/features/settings/preferences";
import type { PracticeReaderGroup } from "../reader-types";
import type { PracticeAssignment } from "../types";

export default async function getPracticeReaderData(
    assignment: PracticeAssignment,
    preferences: Preferences,
): Promise<PracticeReaderGroup[]> {
    const surahNumbers = Array.from(
        {
            length:
                assignment.end.surahNumber - assignment.start.surahNumber + 1,
        },
        (_, index) => assignment.start.surahNumber + index,
    );
    const { reciters } = await getAvailableReciters();
    const reciter = reciters.find((item) => item.id === preferences.reciter);
    const nativeWarshAudio = usesNativeWarshAyahNumbering(reciter);

    return Promise.all(
        surahNumbers.map(async (surahNumber) => {
            const [surahData, translationData, warshChapter] =
                await Promise.all([
                    getSurahData(
                        String(surahNumber),
                        preferences.arabicEdition,
                    ),
                    preferences.showTranslation
                        ? getSurahData(
                              String(surahNumber),
                              preferences.translationEdition,
                          )
                        : Promise.resolve(null),
                    assignment.riwayah === "warsh"
                        ? getWarshChapter(surahNumber)
                        : Promise.resolve(null),
                ]);
            const displayedAyahs = warshChapter
                ? mapWarshAyahs(surahData.ayahs, warshChapter, nativeWarshAudio)
                : surahData.ayahs;
            const minimumAyah =
                surahNumber === assignment.start.surahNumber
                    ? assignment.start.ayahNumber
                    : 1;
            const maximumAyah =
                surahNumber === assignment.end.surahNumber
                    ? assignment.end.ayahNumber
                    : Number.POSITIVE_INFINITY;
            const ayahs = displayedAyahs
                .filter(
                    (ayah) =>
                        !ayah.isBasmalaSentinel &&
                        ayah.numberInSurah >= minimumAyah &&
                        ayah.numberInSurah <= maximumAyah,
                )
                .map((ayah) => {
                    const warshVerse = warshChapter?.verses.find(
                        (verse) => verse.number === ayah.numberInSurah,
                    );
                    const audioAyahNumber = warshVerse
                        ? nativeWarshAudio
                            ? warshVerse.number
                            : getWarshAudioAyahNumbers(
                                  warshVerse,
                                  surahNumber,
                              )[0]
                        : ayah.numberInSurah;
                    const streams =
                        reciter?.scope === "ayah" &&
                        audioAyahNumber !== undefined
                            ? getRecitationStreams(reciter, {
                                  surahNumber,
                                  ayahNumber: audioAyahNumber,
                                  globalAyahNumber:
                                      ayah.hafsGlobalNumber ?? ayah.number,
                              })
                            : [];

                    return {
                        ...ayah,
                        audio: streams[0],
                        audioSecondary: streams.slice(1),
                    };
                });

            return {
                surah: warshChapter
                    ? {
                          ...surahData.surahMeta,
                          numberOfAyahs: warshChapter.verses.length,
                      }
                    : surahData.surahMeta,
                ayahs,
                translatedAyahs: translationData?.ayahs ?? [],
                translationEdition: translationData?.edition,
            };
        }),
    );
}
