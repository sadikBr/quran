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
import type { QuranDivisionMarker } from "@/features/quran/navigation-types";
import getAvailableReciters from "@/features/quran/server/get-available-reciter";
import getQuranNavigationMeta from "@/features/quran/server/get-quran-navigation-meta";
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
    const navigationPromise = getQuranNavigationMeta().catch(() => ({
        juzs: [],
        hizbs: [],
        hizbQuarters: [],
    }));

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
    const [surahs, navigation] = await Promise.all([
        surahsPromise,
        navigationPromise,
    ]);
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
    const markerByDisplayedAyah = new Map<number, QuranDivisionMarker>();

    function displayedMarkerAnchor(
        ayahNumber: number,
        globalAyahNumber: number,
    ) {
        if (!warshChapter) return globalAyahNumber;

        if (
            surahNumber === 1 &&
            ayahNumber === 1 &&
            displayedAyahs[0]?.isBasmalaSentinel
        ) {
            return displayedAyahs[0].number;
        }

        const warshVerse = warshChapter.verses.find((verse) =>
            verse.number_in_hafs.includes(ayahNumber),
        );
        return (
            displayedAyahs.find((ayah) => ayah.numberInSurah === warshVerse?.id)
                ?.number ?? globalAyahNumber
        );
    }

    for (const juz of navigation.juzs) {
        if (juz.surahNumber !== surahNumber) continue;
        const anchor = displayedMarkerAnchor(
            juz.ayahNumber,
            juz.globalAyahNumber,
        );
        const marker = markerByDisplayedAyah.get(anchor) ?? {
            globalAyahNumber: anchor,
        };
        marker.juzNumber = juz.number;
        markerByDisplayedAyah.set(anchor, marker);
    }

    for (const hizb of navigation.hizbs) {
        if (hizb.surahNumber !== surahNumber) continue;
        const anchor = displayedMarkerAnchor(
            hizb.ayahNumber,
            hizb.globalAyahNumber,
        );
        const marker = markerByDisplayedAyah.get(anchor) ?? {
            globalAyahNumber: anchor,
        };
        marker.hizbNumber = hizb.number;
        markerByDisplayedAyah.set(anchor, marker);
    }

    for (const quarter of navigation.hizbQuarters) {
        if (quarter.surahNumber !== surahNumber) continue;
        const anchor = displayedMarkerAnchor(
            quarter.ayahNumber,
            quarter.globalAyahNumber,
        );
        const marker = markerByDisplayedAyah.get(anchor) ?? {
            globalAyahNumber: anchor,
        };
        marker.hizbQuarterNumber = quarter.number;
        markerByDisplayedAyah.set(anchor, marker);
    }

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
                        divisionMarkers={[...markerByDisplayedAyah.values()]}
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
