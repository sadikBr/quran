import { notFound } from "next/navigation";
import QuranPageNavigation from "@/features/quran/components/quran-page-navigation";
import Surah from "@/features/quran/components/surah";
import getSurahData from "@/features/quran/server/get-surah";
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

    const requests = [getSurahData(number, preferences.arabicEdition)];

    if (preferences.showTranslation) {
        requests.push(getSurahData(number, preferences.translationEdition));
    }

    const [surahData, translatedSurahData] = await Promise.all(requests);

    return (
        <div className="flex h-full min-h-0 flex-col">
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
            />
        </div>
    );
}
