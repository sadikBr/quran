import { notFound } from "next/navigation";
import QuranAudioQueue from "@/features/quran/components/quran-audio-queue";
import QuranPageNavigation from "@/features/quran/components/quran-page-navigation";
import Surah from "@/features/quran/components/surah";
import TajweedLegend from "@/features/quran/components/tajweed-legend";
import getAyahAudioStreams from "@/features/quran/helpers/get-ayah-audio-streams";
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

    const [surahData, audioSurahData, translatedSurahData] = await Promise.all([
        getSurahData(number, preferences.arabicEdition),
        getSurahData(number, preferences.reciter),
        preferences.showTranslation
            ? getSurahData(number, preferences.translationEdition)
            : Promise.resolve(null),
    ]);
    const surahs = await surahsPromise;
    const surahAudioStreams = getAyahAudioStreams(audioSurahData);
    const audioQueue =
        surahAudioStreams.length > 0
            ? [{ ayahNumber: null, streams: surahAudioStreams }]
            : audioSurahData.ayahs
                  .map((ayah) => ({
                      ayahNumber: ayah.number,
                      streams: getAyahAudioStreams(ayah),
                  }))
                  .filter((ayah) => ayah.streams.length > 0);
    const ayahsWithAudio = surahData.ayahs.map((ayah, index) => ({
        ...ayah,
        audio: audioSurahData.ayahs[index]?.audio,
        audioSecondary: audioSurahData.ayahs[index]?.audioSecondary,
    }));
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
