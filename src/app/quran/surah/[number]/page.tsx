import Surah from "@/components/quran-renderer/surah";
import { AyahType, SurahType } from "@/types";

export default async function SurahPage({
    params,
}: {
    params: Promise<{ number: string }>;
}) {
    const { number } = await params;
    const response = await fetch(
        `http://localhost:3000/api/v1/surah/${number}/quran-simple`,
    );
    const { surahMeta, ayahs } = await response.json();

    return (
        <div className="p-8">
            <Surah surah={surahMeta} ayahs={ayahs} />
        </div>
    );
}
