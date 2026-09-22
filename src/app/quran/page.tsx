import SurahFrame from "@/features/quran/components/surah-frame";
import getSurahsMeta from "@/features/quran/server/get-surahs-meta";
import type { SurahType } from "@/features/quran/types";

export default async function IndexPage() {
    const surahs: SurahType[] = await getSurahsMeta();

    return (
        <div className="p-4 max-w-lg mx-auto">
            <div className="flex text-xl font-bold items-center justify-around mb-4">
                <div className="ayah border-2 w-32 text-center border-accent text-accent bg-primary px-4 py-2">
                    مكية
                </div>
                <div className="ayah border-2 w-32 text-center border-primary text-primary bg-accent px-4 py-2">
                    مدنية
                </div>
            </div>
            {surahs.map((surah) => (
                <SurahFrame key={surah.number} surah={surah} />
            ))}
        </div>
    );
}
