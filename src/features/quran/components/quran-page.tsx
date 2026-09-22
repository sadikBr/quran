import QuranInfo from "@/lib/quran-info";
import getQuranPageData from "../server/get-quran-page-data";
import type { PageData } from "../types";
import Surah from "./surah";
import { notFound } from "next/navigation";

export default async function QuranPage({ page }: { page: number }) {
    if (
        isNaN(page) ||
        page < QuranInfo.minPageNumber ||
        page > QuranInfo.maxPageNumber
    ) {
        notFound();
    }

    const pageData: PageData = await getQuranPageData(page, "quran-simple");

    return (
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 overflow-auto p-4">
            {Object.keys(pageData.data.surahs).map((surahNumber) => {
                const surah = pageData.data.surahs[surahNumber];
                const ayahs = pageData.data.ayahs.filter(
                    (ayah) => ayah.surah.number === surah.number,
                );
                return <Surah key={surah.name} surah={surah} ayahs={ayahs} />;
            })}
        </div>
    );
}
