import { getArabicNumber } from "@/lib/arabic-numbers";
import Ayah from "@/components/quran-renderer/ayah";
import { AyahType, SurahType } from "@/types";
import SurahFrame from "@/components/quran-renderer/surah-frame";

export default function Surah({
    surah,
    ayahs,
}: {
    surah: SurahType;
    ayahs: AyahType[];
}) {
    return (
        <div className="rtl">
            {ayahs[0].numberInSurah === 1 && <SurahFrame surah={surah} />}
            <div className="space-x-2 text-center">
                {ayahs.map((ayah) => {
                    return <Ayah key={ayah.number} ayah={ayah} />;
                })}
            </div>
        </div>
    );
}
