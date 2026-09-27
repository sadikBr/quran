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
import PageDivisionSummary from "./page-division-summary";
import QuranAudioQueue from "./quran-audio-queue";
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
    const pageQuarters = [
        ...new Set(displayedAyahs.map((ayah) => ayah.hizbQuarter)),
    ];
    const pageHizbs = [
        ...new Set(pageQuarters.map((quarter) => Math.ceil(quarter / 4))),
    ];
    const pageSurahNames = surahNumbers.flatMap((number) => {
        const surah = sourceBySurah.get(number)?.surahMeta;
        if (!surah) return [];
        return [preferences.language === "ar" ? surah.name : surah.englishName];
    });
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
                    streams: reciter
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
            className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-0 overflow-auto p-4"
        >
            <PageDivisionSummary
                surahNames={pageSurahNames}
                juzs={pageJuzs}
                hizbs={pageHizbs}
                hizbQuarters={pageQuarters}
            />
            <div className="mb-3 flex items-center justify-end gap-2">
                {audioQueue.length > 0 && (
                    <QuranAudioQueue
                        queue={audioQueue}
                        continuousRecitation={preferences.continuousRecitation}
                        showReadAll
                    />
                )}
                <FocusModeToggle />
            </div>
            {surahNumbers.map((surahNumber) => {
                const source = sourceBySurah.get(surahNumber);
                const chapter = pageEntries.find(
                    (entry) => entry.chapter.id === surahNumber,
                )?.chapter;
                if (!source || !chapter) return null;

                const ayahs = displayedBySurah.get(surahNumber) ?? [];
                const mappedHafsGlobals = new Set(
                    ayahs.flatMap((ayah) => ayah.hafsGlobalNumbers ?? []),
                );
                const translation = translationsBySurah.get(surahNumber);

                return (
                    <Surah
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
                        highlightAyahs={false}
                        divisionMarkers={[...markerByAyah.values()]}
                    />
                );
            })}
        </div>
    );
}
