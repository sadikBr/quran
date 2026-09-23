import { notFound } from "next/navigation";
import getPreferences from "@/features/settings/server/get-preferences";
import QuranInfo from "@/lib/quran-info";
import getQuranPageData from "../server/get-quran-page-data";
import Surah from "./surah";

export default async function QuranPage({ page }: { page: number }) {
    if (
        isNaN(page) ||
        page < QuranInfo.minPageNumber ||
        page > QuranInfo.maxPageNumber
    ) {
        notFound();
    }

    const preferences = await getPreferences();

    const requests = [getQuranPageData(page, preferences.arabicEdition)];

    if (preferences.showTranslation) {
        requests.push(getQuranPageData(page, preferences.translationEdition));
    }

    const [pageData, translatedPageData] = await Promise.all(requests);

    return (
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 overflow-auto p-4">
            {Object.keys(pageData.data.surahs).map((surahNumber) => {
                const surah = pageData.data.surahs[surahNumber];
                const ayahs = pageData.data.ayahs.filter(
                    (ayah) => ayah.surah.number === surah.number,
                );
                const translatedAyahs = preferences.showTranslation
                    ? translatedPageData.data.ayahs.filter(
                          (ayah) => ayah.surah.number === surah.number,
                      )
                    : [];

                return (
                    <Surah
                        key={surah.name}
                        surah={surah}
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
