import Surah from "@/features/quran/components/surah";
import getSurahData from "@/features/quran/server/get-surah";

export default async function SurahPage({
    params,
}: {
    params: Promise<{ number: string }>;
}) {
    const { number } = await params;
    const { surahMeta, ayahs } = await getSurahData(number, "quran-simple");

    return (
        <div className="p-8">
            <Surah surah={surahMeta} ayahs={ayahs} />
        </div>
    );
}
