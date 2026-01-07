import { PageData } from "@/types";
import Surah from "./surah";

export default async function QuranPage({ page }: { page: number }) {
    const url = `http://localhost:3000/api/v1/page/${page}/quran-simple`;

    const response = await fetch(url);

    const pageData: PageData = await response.json();

    return (
        <div className="rtl w-screen h-screen p-8 overflow-hidden flex flex-col gap-8">
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
