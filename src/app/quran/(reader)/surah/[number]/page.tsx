import { notFound } from "next/navigation";
import QuranAudioQueue from "@/features/quran/components/quran-audio-queue";
import QuranPageNavigation from "@/features/quran/components/quran-page-navigation";
import Surah from "@/features/quran/components/surah";
import TajweedLegend from "@/features/quran/components/tajweed-legend";
import getRecitationStreams from "@/features/quran/helpers/get-recitation-streams";
import getAvailableReciters from "@/features/quran/server/get-available-reciter";
import getSurahData from "@/features/quran/server/get-surah";
import getSurahsMeta from "@/features/quran/server/get-surahs-meta";
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

    const [surahData, { reciters }, translatedSurahData] = await Promise.all([
        getSurahData(number, preferences.arabicEdition),
        getAvailableReciters(),
        preferences.showTranslation
            ? getSurahData(number, preferences.translationEdition)
            : Promise.resolve(null),
    ]);
    const surahs = await surahsPromise;
    const reciter = reciters.find((item) => item.id === preferences.reciter);
    const surahStreams =
        reciter?.scope === "surah"
            ? getRecitationStreams(reciter, { surahNumber })
            : [];
    const audioQueue =
        surahStreams.length > 0
            ? [{ ayahNumber: null, streams: surahStreams }]
            : surahData.ayahs
                  .map((ayah) => ({
                      ayahNumber: ayah.number,
                      streams: reciter
                          ? getRecitationStreams(reciter, {
                                surahNumber,
                                ayahNumber: ayah.numberInSurah,
                                globalAyahNumber: ayah.number,
                            })
                          : [],
                  }))
                  .filter((ayah) => ayah.streams.length > 0);
    const ayahsWithAudio = surahData.ayahs.map((ayah) => {
        const streams =
            reciter?.scope === "ayah"
                ? getRecitationStreams(reciter, {
                      surahNumber,
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
    const showTajweedLegend = surahData.edition.identifier === "quran-tajweed";

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
                        surah={surahData.surahMeta}
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
