import { notFound } from "next/navigation";
import QuranAudioQueue from "@/features/quran/components/quran-audio-queue";
import QuranPageNavigation from "@/features/quran/components/quran-page-navigation";
import Surah from "@/features/quran/components/surah";
import TajweedLegend from "@/features/quran/components/tajweed-legend";
import getRecitationStreams from "@/features/quran/helpers/get-recitation-streams";
import mapWarshAyahs, {
    getWarshAudioAyahNumbers,
    getWarshPlaybackNumberForHafs,
    usesNativeWarshAyahNumbering,
} from "@/features/quran/helpers/map-warsh-ayahs";
import getAvailableReciters from "@/features/quran/server/get-available-reciter";
import getSurahData from "@/features/quran/server/get-surah";
import getSurahsMeta from "@/features/quran/server/get-surahs-meta";
import getWarshChapter from "@/features/quran/server/get-warsh-chapter";
import ReadingProgressTracker from "@/features/reading-progress/components/reading-progress-tracker";
import getPreferences from "@/features/settings/server/get-preferences";
import QuranInfo from "@/lib/quran-info";

export default async function SurahPage({
    params,
}: {
    params: Promise<{ number: string }>;
}) {
    const { number } = await params;
    const surahNumber = Number(number);

    if (
        !Number.isInteger(surahNumber) ||
        surahNumber < QuranInfo.minSurahNumber ||
        surahNumber > QuranInfo.maxSurahNumber
    ) {
        notFound();
    }

    const preferences = await getPreferences();
    const surahsPromise = getSurahsMeta().catch(() => []);

    const [surahData, { reciters }, translatedSurahData, warshChapter] =
        await Promise.all([
            getSurahData(number, preferences.arabicEdition),
            getAvailableReciters(),
            preferences.showTranslation
                ? getSurahData(number, preferences.translationEdition)
                : Promise.resolve(null),
            preferences.riwayah === "warsh"
                ? getWarshChapter(surahNumber)
                : Promise.resolve(null),
        ]);
    const surahs = await surahsPromise;
    const reciter = reciters.find((item) => item.id === preferences.reciter);
    const nativeWarshAudio = usesNativeWarshAyahNumbering(reciter);
    const displayedAyahs = warshChapter
        ? mapWarshAyahs(surahData.ayahs, warshChapter, nativeWarshAudio)
        : surahData.ayahs;
    const displayedSurah = warshChapter
        ? {
              ...surahData.surahMeta,
              numberOfAyahs: warshChapter.verses.length,
          }
        : surahData.surahMeta;
    const surahStreams =
        reciter?.scope === "surah"
            ? getRecitationStreams(reciter, { surahNumber })
            : [];
    const audioQueue =
        surahStreams.length > 0
            ? [{ ayahNumber: null, streams: surahStreams }]
            : warshChapter
              ? nativeWarshAudio
                  ? displayedAyahs
                        .map((ayah) => ({
                            ayahNumber: ayah.audioNumber ?? ayah.number,
                            streams: reciter
                                ? getRecitationStreams(reciter, {
                                      surahNumber,
                                      ayahNumber: ayah.isBasmalaSentinel
                                          ? 0
                                          : ayah.numberInSurah,
                                      globalAyahNumber: ayah.number,
                                  })
                                : [],
                        }))
                        .filter((ayah) => ayah.streams.length > 0)
                  : surahData.ayahs
                        .map((ayah) => {
                            const playbackNumber =
                                getWarshPlaybackNumberForHafs(
                                    warshChapter,
                                    ayah.numberInSurah,
                                );

                            return {
                                ayahNumber: playbackNumber,
                                streams:
                                    reciter && playbackNumber !== null
                                        ? getRecitationStreams(reciter, {
                                              surahNumber,
                                              ayahNumber: ayah.numberInSurah,
                                              globalAyahNumber: ayah.number,
                                          })
                                        : [],
                            };
                        })
                        .filter(
                            (ayah) =>
                                ayah.ayahNumber !== null &&
                                ayah.streams.length > 0,
                        )
              : displayedAyahs
                    .map((ayah) => ({
                        ayahNumber: ayah.audioNumber ?? ayah.number,
                        streams: reciter
                            ? getRecitationStreams(reciter, {
                                  surahNumber,
                                  ayahNumber: ayah.numberInSurah,
                                  globalAyahNumber: ayah.number,
                              })
                            : [],
                    }))
                    .filter((ayah) => ayah.streams.length > 0);
    const ayahsWithAudio = displayedAyahs.map((ayah) => {
        const warshVerse = warshChapter?.verses.find(
            (verse) => verse.id === ayah.numberInSurah,
        );
        const audioAyahNumber = warshVerse
            ? nativeWarshAudio
                ? warshVerse.id
                : getWarshAudioAyahNumbers(warshVerse, surahNumber)[0]
            : ayah.numberInSurah;
        const streams =
            reciter?.scope === "ayah" && audioAyahNumber !== undefined
                ? getRecitationStreams(reciter, {
                      surahNumber,
                      ayahNumber: audioAyahNumber,
                      globalAyahNumber: ayah.number,
                  })
                : [];

        return {
            ...ayah,
            audio: streams[0],
            audioSecondary: streams.slice(1),
        };
    });
    const showTajweedLegend =
        preferences.riwayah === "hafs" &&
        surahData.edition.identifier === "quran-tajweed";

    return (
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
            <ReadingProgressTracker locationType="surah" number={surahNumber} />
            <div data-quran-swipe-content className="flex-1 overflow-y-auto">
                <div className="mx-auto max-w-5xl p-4">
                    {(showTajweedLegend || audioQueue.length > 0) && (
                        <div className="mb-3 flex items-center justify-end gap-2">
                            {showTajweedLegend && <TajweedLegend />}
                            <QuranAudioQueue
                                queue={audioQueue}
                                continuousRecitation={
                                    preferences.continuousRecitation
                                }
                                showReadAll
                                scope="surah"
                            />
                        </div>
                    )}
                    <Surah
                        surah={displayedSurah}
                        ayahs={ayahsWithAudio}
                        translatedAyahs={
                            preferences.showTranslation
                                ? (translatedSurahData?.ayahs ?? [])
                                : []
                        }
                        showTranslation={preferences.showTranslation}
                        translationEdition={translatedSurahData?.edition}
                    />
                </div>
            </div>
            <QuranPageNavigation
                currentNumber={surahNumber}
                readingMode="surah"
                surahs={surahs}
            />
        </div>
    );
}
