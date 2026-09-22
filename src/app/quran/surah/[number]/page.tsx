import { notFound } from "next/navigation";
import Surah from "@/features/quran/components/surah";
import getSurahData from "@/features/quran/server/get-surah";
import QuranInfo from "@/lib/quran-info";
import getPreferences from "@/features/settings/server/get-preferences";

export default async function SurahPage({
    params,
}: {
    params: Promise<{ number: string }>;
}) {
    const { number } = await params;

    if (
        isNaN(parseInt(number)) ||
        parseInt(number) < QuranInfo.minSurahNumber ||
        parseInt(number) > QuranInfo.maxSurahNumber
    ) {
        notFound();
    }

    const preferences = await getPreferences();

    const requests = [
        getSurahData(number, preferences.arabicEdition),
        getSurahData(number, preferences.translationEdition),
    ];

    const [surahData, translatedSurahData] = await Promise.all(requests);

    return (
        <div className="h-full overflow-y-auto">
            <div className="mx-auto max-w-5xl p-4">
                <Surah
                    surah={surahData.surahMeta}
                    ayahs={surahData.ayahs}
                    translatedAyahs={translatedSurahData.ayahs}
                    showTranslation={preferences.showTranslation}
                />
            </div>
        </div>
    );
}
