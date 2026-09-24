import { notFound } from "next/navigation";
import QuranAudioQueue from "@/features/quran/components/quran-audio-queue";
import QuranPageNavigation from "@/features/quran/components/quran-page-navigation";
import Surah from "@/features/quran/components/surah";
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

    const requests = [getSurahData(number, preferences.arabicEdition)];

    if (preferences.showTranslation) {
        requests.push(getSurahData(number, preferences.translationEdition));
    }

    const [surahData, translatedSurahData] = await Promise.all(requests);
    const surahs = await surahsPromise;
    const audioQueue = surahData.ayahs
        .map((ayah) => ({
            ayahNumber: ayah.number,
            streams: getAyahAudioStreams(ayah),
        }))
        .filter((ayah) => ayah.streams.length > 0);

    return (
        <div className="flex h-full min-h-0 flex-col">
            <ReadingProgressTracker locationType="surah" number={surahNumber} />
            <QuranAudioQueue
                queue={audioQueue}
                continuousRecitation={preferences.continuousRecitation}
            />
            <div className="flex-1 overflow-y-auto">
                <div className="mx-auto max-w-5xl p-4">
                    <Surah
                        surah={surahData.surahMeta}
                        ayahs={surahData.ayahs}
                        translatedAyahs={
                            preferences.showTranslation
                                ? translatedSurahData.ayahs
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
