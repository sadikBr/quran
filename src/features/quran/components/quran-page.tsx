import { notFound } from "next/navigation";
import getPreferences from "@/features/settings/server/get-preferences";
import QuranInfo from "@/lib/quran-info";
import getRecitationStreams from "../helpers/get-recitation-streams";
import mapWarshAyahs, {
    getWarshAudioAyahNumbers,
    getWarshPlaybackNumberForHafs,
    usesNativeWarshAyahNumbering,
} from "../helpers/map-warsh-ayahs";
import type { QuranDivisionMarker } from "../navigation-types";
import getAvailableReciters from "../server/get-available-reciter";
import getQuranNavigationMeta from "../server/get-quran-navigation-meta";
import getQuranPageData from "../server/get-quran-page-data";
import getWarshChapter from "../server/get-warsh-chapter";
import PageDivisionSummary from "./page-division-summary";
import QuranAudioQueue from "./quran-audio-queue";
import Surah from "./surah";
import TajweedLegend from "./tajweed-legend";

export default async function QuranPage({ page }: { page: number }) {
    if (
        Number.isNaN(page) ||
        page < QuranInfo.minPageNumber ||
        page > QuranInfo.maxPageNumber
    ) {
        notFound();
    }

    const preferences = await getPreferences();

    const [pageData, { reciters }, translatedPageData, navigation] =
        await Promise.all([
            getQuranPageData(page, preferences.arabicEdition),
            getAvailableReciters(),
            preferences.showTranslation
                ? getQuranPageData(page, preferences.translationEdition)
                : Promise.resolve(null),
            getQuranNavigationMeta().catch(() => ({
                juzs: [],
                hizbs: [],
                hizbQuarters: [],
            })),
        ]);
    const reciter = reciters.find((item) => item.id === preferences.reciter);
    const nativeWarshAudio = usesNativeWarshAyahNumbering(reciter);
    const warshChapters =
        preferences.riwayah === "warsh"
            ? await Promise.all(
                  Object.keys(pageData.data.surahs).map((surahNumber) =>
                      getWarshChapter(Number(surahNumber)),
                  ),
              )
            : [];
    const warshChaptersBySurah = new Map(
        warshChapters.map((chapter) => [chapter.id, chapter]),
    );
    const displayedAyahs =
        preferences.riwayah === "warsh"
            ? Object.keys(pageData.data.surahs).flatMap((surahNumber) => {
                  const number = Number(surahNumber);
                  const chapter = warshChaptersBySurah.get(number);
                  const hafsAyahs = pageData.data.ayahs.filter(
                      (ayah) => ayah.surah.number === number,
                  );

                  return chapter
                      ? mapWarshAyahs(hafsAyahs, chapter, nativeWarshAudio)
                      : [];
              })
            : pageData.data.ayahs;
    const audioQueue =
        preferences.riwayah === "warsh"
            ? nativeWarshAudio
                ? displayedAyahs
                      .map((ayah) => ({
                          ayahNumber: ayah.audioNumber ?? ayah.number,
                          streams: reciter
                              ? getRecitationStreams(reciter, {
                                    surahNumber: ayah.surah.number,
                                    ayahNumber: ayah.isBasmalaSentinel
                                        ? 0
                                        : ayah.numberInSurah,
                                    globalAyahNumber: ayah.number,
                                })
                              : [],
                      }))
                      .filter((ayah) => ayah.streams.length > 0)
                : pageData.data.ayahs
                      .map((ayah) => {
                          const chapter = warshChaptersBySurah.get(
                              ayah.surah.number,
                          );
                          const playbackNumber = chapter
                              ? getWarshPlaybackNumberForHafs(
                                    chapter,
                                    ayah.numberInSurah,
                                )
                              : null;

                          return {
                              ayahNumber: playbackNumber,
                              streams:
                                  reciter && playbackNumber !== null
                                      ? getRecitationStreams(reciter, {
                                            surahNumber: ayah.surah.number,
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
                                surahNumber: ayah.surah.number,
                                ayahNumber: ayah.numberInSurah,
                                globalAyahNumber: ayah.number,
                            })
                          : [],
                  }))
                  .filter((ayah) => ayah.streams.length > 0);
    const showTajweedLegend =
        preferences.riwayah === "hafs" &&
        pageData.data.edition.identifier === "quran-tajweed";
    const pageJuzs = [...new Set(pageData.data.ayahs.map((ayah) => ayah.juz))];
    const pageHizbQuarters = [
        ...new Set(pageData.data.ayahs.map((ayah) => ayah.hizbQuarter)),
    ];
    const pageHizbs = [
        ...new Set(
            pageHizbQuarters.map((hizbQuarter) => Math.ceil(hizbQuarter / 4)),
        ),
    ];
    const markerByDisplayedAyah = new Map<number, QuranDivisionMarker>();

    function displayedMarkerAnchor(
        surahNumber: number,
        ayahNumber: number,
        globalAyahNumber: number,
    ) {
        const chapter = warshChaptersBySurah.get(surahNumber);
        if (!chapter) return globalAyahNumber;

        if (
            surahNumber === 1 &&
            ayahNumber === 1 &&
            displayedAyahs[0]?.isBasmalaSentinel
        ) {
            return displayedAyahs[0].number;
        }

        const warshVerse = chapter.verses.find((verse) =>
            verse.number_in_hafs.includes(ayahNumber),
        );
        return (
            displayedAyahs.find(
                (ayah) =>
                    ayah.surah.number === surahNumber &&
                    ayah.numberInSurah === warshVerse?.id,
            )?.number ?? globalAyahNumber
        );
    }

    function addPageMarker(
        reference: (typeof navigation.juzs)[number],
        kind: "juz" | "hizb" | "quarter",
    ) {
        if (reference.pageNumber !== page) return;
        const anchor = displayedMarkerAnchor(
            reference.surahNumber,
            reference.ayahNumber,
            reference.globalAyahNumber,
        );
        const marker = markerByDisplayedAyah.get(anchor) ?? {
            globalAyahNumber: anchor,
        };

        if (kind === "juz") marker.juzNumber = reference.number;
        if (kind === "hizb") marker.hizbNumber = reference.number;
        if (kind === "quarter") marker.hizbQuarterNumber = reference.number;
        markerByDisplayedAyah.set(anchor, marker);
    }

    for (const juz of navigation.juzs) addPageMarker(juz, "juz");
    for (const hizb of navigation.hizbs) addPageMarker(hizb, "hizb");
    for (const quarter of navigation.hizbQuarters) {
        addPageMarker(quarter, "quarter");
    }

    return (
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-0 overflow-auto p-4">
            <PageDivisionSummary
                juzs={pageJuzs}
                hizbs={pageHizbs}
                hizbQuarters={pageHizbQuarters}
            />
            {(showTajweedLegend || audioQueue.length > 0) && (
                <div className="mb-3 flex items-center justify-end gap-2">
                    {showTajweedLegend && <TajweedLegend />}
                    <QuranAudioQueue
                        queue={audioQueue}
                        continuousRecitation={preferences.continuousRecitation}
                        showReadAll
                    />
                </div>
            )}
            {Object.keys(pageData.data.surahs).map((surahNumber) => {
                const surah = pageData.data.surahs[surahNumber];
                const chapter = warshChaptersBySurah.get(surah.number);
                const displayedSurah = chapter
                    ? { ...surah, numberOfAyahs: chapter.verses.length }
                    : surah;
                const ayahs = displayedAyahs
                    .filter((ayah) => ayah.surah.number === surah.number)
                    .map((ayah) => {
                        const warshVerse = chapter?.verses.find(
                            (verse) => verse.id === ayah.numberInSurah,
                        );
                        const audioAyahNumber = warshVerse
                            ? nativeWarshAudio
                                ? warshVerse.id
                                : getWarshAudioAyahNumbers(
                                      warshVerse,
                                      ayah.surah.number,
                                  )[0]
                            : ayah.numberInSurah;
                        const streams =
                            preferences.riwayah === "hafs" &&
                            reciter &&
                            audioAyahNumber !== undefined
                                ? getRecitationStreams(reciter, {
                                      surahNumber: ayah.surah.number,
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
                const translatedAyahs = preferences.showTranslation
                    ? (translatedPageData?.data.ayahs.filter(
                          (ayah) => ayah.surah.number === surah.number,
                      ) ?? [])
                    : [];

                return (
                    <Surah
                        key={surah.name}
                        surah={displayedSurah}
                        ayahs={ayahs}
                        translatedAyahs={translatedAyahs}
                        showTranslation={preferences.showTranslation}
                        translationEdition={translatedPageData?.data.edition}
                        highlightAyahs={preferences.riwayah === "hafs"}
                        divisionMarkers={[...markerByDisplayedAyah.values()]}
                    />
                );
            })}
        </div>
    );
}
