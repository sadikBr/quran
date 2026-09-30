import { notFound } from "next/navigation";
import getPreferences from "@/features/settings/server/get-preferences";
import QuranInfo from "@/lib/quran-info";
import getRecitationStreams from "../helpers/get-recitation-streams";
import type { QuranDivisionMarker } from "../navigation-types";
import getAvailableReciters from "../server/get-available-reciter";
import getQuranNavigationMeta from "../server/get-quran-navigation-meta";
import getQuranPageData from "../server/get-quran-page-data";
import FocusModeToggle from "./focus-mode-toggle";
import MissingRecitation from "./missing-recitation";
import PageDivisionSummary from "./page-division-summary";
import QuranAudioQueue from "./quran-audio-queue";
import ReaderToolbar from "./reader-toolbar";
import Surah from "./surah";
import TajweedLegend from "./tajweed-legend";
import WarshQuranPage from "./warsh-quran-page";

export default async function QuranPage({ page }: { page: number }) {
    if (
        !Number.isInteger(page) ||
        page < QuranInfo.minPageNumber ||
        page > QuranInfo.maxPageNumber
    ) {
        notFound();
    }

    const preferences = await getPreferences();
    if (preferences.riwayah === "warsh") {
        return <WarshQuranPage page={page} />;
    }

    const [pageData, { reciters }, translatedPageData, navigation] =
        await Promise.all([
            getQuranPageData(page, preferences.arabicEdition),
            getAvailableReciters(),
            preferences.showTranslation
                ? getQuranPageData(page, preferences.translationEdition)
                : Promise.resolve(null),
            getQuranNavigationMeta().catch(() => ({
                pages: [],
                juzs: [],
                hizbs: [],
                hizbQuarters: [],
            })),
        ]);
    const reciter = reciters.find((item) => item.id === preferences.reciter);
    const audioQueue = pageData.data.ayahs
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
    const pageJuzs = [...new Set(pageData.data.ayahs.map((ayah) => ayah.juz))];
    const firstAyah = pageData.data.ayahs[0];
    const markerByAyah = new Map<number, QuranDivisionMarker>();

    function addMarkers(
        references: typeof navigation.juzs,
        kind: "juz" | "hizb" | "quarter",
    ) {
        for (const reference of references) {
            if (reference.pageNumber !== page) continue;
            const marker = markerByAyah.get(reference.globalAyahNumber) ?? {
                globalAyahNumber: reference.globalAyahNumber,
            };
            if (kind === "juz") marker.juzNumber = reference.number;
            if (kind === "hizb") marker.hizbNumber = reference.number;
            if (kind === "quarter") {
                marker.hizbQuarterNumber = reference.number;
            }
            markerByAyah.set(reference.globalAyahNumber, marker);
        }
    }

    addMarkers(navigation.juzs, "juz");
    addMarkers(navigation.hizbs, "hizb");
    addMarkers(navigation.hizbQuarters, "quarter");

    return (
        <div
            data-quran-scroll-container
            className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-0 overflow-auto p-3 sm:p-4"
        >
            <PageDivisionSummary
                continuationSurah={
                    firstAyah?.numberInSurah > 1 ? firstAyah.surah : undefined
                }
                juzs={pageJuzs}
                page={page}
                navigation={navigation}
            />
            <ReaderToolbar>
                {pageData.data.edition.identifier === "quran-tajweed" && (
                    <TajweedLegend embedded />
                )}
                {audioQueue.length > 0 && (
                    <QuranAudioQueue
                        queue={audioQueue}
                        continuousRecitation={preferences.continuousRecitation}
                        showReadAll
                        embedded
                    />
                )}
                <FocusModeToggle embedded />
            </ReaderToolbar>
            {Object.keys(pageData.data.surahs).map((surahNumber) => {
                const surah = pageData.data.surahs[surahNumber];
                const ayahs = pageData.data.ayahs
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

                return (
                    <div key={surah.number}>
                        <MissingRecitation
                            reciter={reciter}
                            surahNumber={surah.number}
                        />
                        <Surah
                            showSurahHeading
                            showSurahDetails
                            key={surah.name}
                            surah={surah}
                            ayahs={ayahs}
                            translatedAyahs={
                                preferences.showTranslation
                                    ? (translatedPageData?.data.ayahs.filter(
                                          (ayah) =>
                                              ayah.surah.number ===
                                              surah.number,
                                      ) ?? [])
                                    : []
                            }
                            showTranslation={preferences.showTranslation}
                            translationEdition={
                                translatedPageData?.data.edition
                            }
                            divisionMarkers={[...markerByAyah.values()]}
                            riwayah="hafs"
                        />
                    </div>
                );
            })}
        </div>
    );
}
