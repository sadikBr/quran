import getQuranPageData from "../server/get-quran-page-data";
import type { PageData } from "../types";
import Surah from "./surah";

export default async function QuranPage({ page }: { page: number }) {
    const pageData: PageData = await getQuranPageData(page, "quran-simple");

    return (
        <div className="flex-1 p-8 overflow-auto flex flex-col gap-4">
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
