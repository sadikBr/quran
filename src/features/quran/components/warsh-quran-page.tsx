import getPreferences from "@/features/settings/server/get-preferences";
import getRecitationStreams from "../helpers/get-recitation-streams";
import mapWarshAyahs, {
    getWarshAudioAyahNumbers,
    usesNativeWarshAyahNumbering,
} from "../helpers/map-warsh-ayahs";
import type { QuranDivisionMarker } from "../navigation-types";
import getAvailableReciters from "../server/get-available-reciter";
import getSurahData from "../server/get-surah";
import {
    getWarshNavigationMeta,
    getWarshPageVerses,
} from "../server/get-warsh-mushaf";
import FocusModeToggle from "./focus-mode-toggle";
import MissingRecitation from "./missing-recitation";
import PageDivisionSummary from "./page-division-summary";
import QuranAudioQueue from "./quran-audio-queue";
import ReaderToolbar from "./reader-toolbar";
import Surah from "./surah";

export default async function WarshQuranPage({ page }: { page: number }) {
    const preferences = await getPreferences();
    const [pageEntries, navigation, { reciters }] = await Promise.all([
        getWarshPageVerses(page),
        getWarshNavigationMeta(),
        getAvailableReciters(),
    ]);
    const surahNumbers = [
        ...new Set(pageEntries.map(({ chapter }) => chapter.id)),
    ];
    const sourceBySurah = new Map(
        await Promise.all(
            surahNumbers.map(
                async (surahNumber) =>
                    [
                        surahNumber,
                        await getSurahData(String(surahNumber), "quran-simple"),
                    ] as const,
            ),
        ),
    );
    const translationsBySurah = new Map(
        preferences.showTranslation
            ? await Promise.all(
                  surahNumbers.map(
                      async (surahNumber) =>
                          [
                              surahNumber,
                              await getSurahData(
                                  String(surahNumber),
                                  preferences.translationEdition,
                              ),
                          ] as const,
                  ),
              )
            : [],
    );
    const reciter = reciters.find((item) => item.id === preferences.reciter);
    const nativeAudio = usesNativeWarshAyahNumbering(reciter);
    const displayedBySurah = new Map(
        surahNumbers.map((surahNumber) => {
            const source = sourceBySurah.get(surahNumber);
            const chapter = pageEntries.find(
                (entry) => entry.chapter.id === surahNumber,
            )?.chapter;
            const mapped =
                source && chapter
                    ? mapWarshAyahs(source.ayahs, chapter, nativeAudio)
                    : [];
            return [
                surahNumber,
                mapped.filter((ayah) => ayah.page === page),
            ] as const;
        }),
    );
    const displayedAyahs = [...displayedBySurah.values()].flat();
    const pageJuzs = [...new Set(displayedAyahs.map((ayah) => ayah.juz))];
    const firstAyah = displayedAyahs[0];
    const continuationSurah =
        firstAyah?.numberInSurah > 1
            ? sourceBySurah.get(surahNumbers[0])?.surahMeta
            : undefined;
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

    const audioQueue = [...displayedBySurah.entries()]
        .flatMap(([surahNumber, ayahs]) =>
            ayahs.map((ayah) => {
                const chapter = pageEntries.find(
                    (entry) => entry.chapter.id === surahNumber,
                )?.chapter;
                const verse = chapter?.verses.find(
                    (item) => item.number === ayah.numberInSurah,
                );
                const ayahNumber = ayah.isBasmalaSentinel
                    ? 0
                    : nativeAudio
                      ? ayah.numberInSurah
                      : verse
                        ? getWarshAudioAyahNumbers(verse, surahNumber)[0]
                        : ayah.numberInSurah;

                return {
                    ayahNumber: ayah.audioNumber ?? ayah.number,
                    streams:
                        reciter?.scope === "ayah"
                            ? getRecitationStreams(reciter, {
                                  surahNumber,
                                  ayahNumber,
                                  globalAyahNumber:
                                      ayah.hafsGlobalNumber ?? ayah.number,
                              })
                            : [],
                };
            }),
        )
        .filter((item) => item.streams.length > 0);

    return (
        <div
            data-quran-scroll-container
            className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-0 overflow-auto p-3 sm:p-4"
        >
            <PageDivisionSummary
                continuationSurah={continuationSurah}
                juzs={pageJuzs}
                page={page}
                navigation={navigation}
            />
            <ReaderToolbar>
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
            {surahNumbers.map((surahNumber) => {
                const source = sourceBySurah.get(surahNumber);
                const chapter = pageEntries.find(
                    (entry) => entry.chapter.id === surahNumber,
                )?.chapter;
                if (!source || !chapter) return null;

                const ayahs = (displayedBySurah.get(surahNumber) ?? []).map(
                    (ayah) => {
                        const streams =
                            reciter?.scope === "ayah" && !ayah.isBasmalaSentinel
                                ? (audioQueue.find(
                                      (item) =>
                                          item.ayahNumber ===
                                          (ayah.audioNumber ?? ayah.number),
                                  )?.streams ?? [])
                                : [];
                        return {
                            ...ayah,
                            audio: streams[0],
                            audioSecondary: streams.slice(1),
                        };
                    },
                );
                const mappedHafsGlobals = new Set(
                    ayahs.flatMap((ayah) => ayah.hafsGlobalNumbers ?? []),
                );
                const translation = translationsBySurah.get(surahNumber);

                return (
                    <div key={surahNumber}>
                        <MissingRecitation
                            reciter={reciter}
                            surahNumber={surahNumber}
                        />
                        <Surah
                            showSurahHeading
                            showSurahDetails
                            key={surahNumber}
                            surah={{
                                ...source.surahMeta,
                                numberOfAyahs: chapter.verses.length,
                            }}
                            ayahs={ayahs}
                            translatedAyahs={
                                translation?.ayahs.filter((ayah) =>
                                    mappedHafsGlobals.has(ayah.number),
                                ) ?? []
                            }
                            showTranslation={preferences.showTranslation}
                            translationEdition={translation?.edition}
                            highlightAyahs={nativeAudio}
                            divisionMarkers={[...markerByAyah.values()]}
                            riwayah="warsh"
                        />
                    </div>
                );
            })}
        </div>
    );
}
