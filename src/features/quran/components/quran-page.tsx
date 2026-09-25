import { notFound } from "next/navigation";
import getPreferences from "@/features/settings/server/get-preferences";
import QuranInfo from "@/lib/quran-info";
import getRecitationStreams from "../helpers/get-recitation-streams";
import mapWarshAyahs from "../helpers/map-warsh-ayahs";
import getAvailableReciters from "../server/get-available-reciter";
import getQuranPageData from "../server/get-quran-page-data";
import getWarshChapter from "../server/get-warsh-chapter";
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

    const [pageData, { reciters }, translatedPageData] = await Promise.all([
        getQuranPageData(page, preferences.arabicEdition),
        getAvailableReciters(),
        preferences.showTranslation
            ? getQuranPageData(page, preferences.translationEdition)
            : Promise.resolve(null),
    ]);
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

                  return chapter ? mapWarshAyahs(hafsAyahs, chapter) : [];
              })
            : pageData.data.ayahs;
    const reciter = reciters.find((item) => item.id === preferences.reciter);
    const audioQueue = displayedAyahs
        .filter((ayah) => !ayah.isBasmalaSentinel)
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

    return (
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-0 overflow-auto p-4">
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
                        const streams = reciter
                            ? getRecitationStreams(reciter, {
                                  surahNumber: ayah.surah.number,
                                  ayahNumber: ayah.numberInSurah,
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
                    />
                );
            })}
        </div>
    );
}
