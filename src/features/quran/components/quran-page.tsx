import { notFound } from "next/navigation";
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

    const requests = [
        getQuranPageData(page, "quran-simple"),
        getQuranPageData(page, "en.sahih"),
    ];

    const [pageData, translatedPageData] = await Promise.all(requests);

    return (
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 overflow-auto p-4">
            {Object.keys(pageData.data.surahs).map((surahNumber) => {
                const surah = pageData.data.surahs[surahNumber];
                const ayahs = pageData.data.ayahs.filter(
                    (ayah) => ayah.surah.number === surah.number,
                );
                const translatedAyahs = translatedPageData.data.ayahs.filter(
                    (ayah) => ayah.surah.number === surah.number,
                );

                return (
                    <Surah
                        key={surah.name}
                        surah={surah}
                        ayahs={ayahs}
                        translatedAyahs={translatedAyahs}
                    />
                );
            })}
        </div>
    );
}
