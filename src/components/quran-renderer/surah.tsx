import { getArabicNumber } from "@/lib/arabic-numbers";
import Ayah from "@/components/quran-renderer/ayah";
import { AyahType, SurahType } from "@/types";

export default function Surah({
    surah,
    ayahs,
}: {
    surah: SurahType;
    ayahs: AyahType[];
}) {
    return (
        <div>
            {ayahs[0].numberInSurah === 1 && (
                <div className="surah-name text-center my-4">
                    {getArabicNumber(surah.number)}
                </div>
            )}
            <div className="flex items-center justify-center flex-wrap gap-2">
                {ayahs.map((ayah) => {
                    return <Ayah key={ayah.number} ayah={ayah} />;
                })}
            </div>
        </div>
    );
}
