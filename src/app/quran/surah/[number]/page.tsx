import Surah from "@/features/quran/components/surah";
import getSurahData from "@/features/quran/server/get-surah";
import QuranInfo from "@/lib/quran-info";
import { notFound } from "next/navigation";

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

    const { surahMeta, ayahs } = await getSurahData(number, "quran-simple");

    return (
        <div className="h-full overflow-y-auto">
            <div className="mx-auto max-w-5xl p-4">
                <Surah surah={surahMeta} ayahs={ayahs} />
            </div>
        </div>
    );
}
