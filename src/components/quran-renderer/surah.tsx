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
                <div className="surah-name text-primary text-6xl text-center my-2">
                    {getArabicNumber(surah.number)}
                </div>
            )}
            <div className="space-x-2 text-center">
                {ayahs.map((ayah) => {
                    return <Ayah key={ayah.number} ayah={ayah} />;
                })}
            </div>
        </div>
    );
}
