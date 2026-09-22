import type { AyahType, SurahType } from "../types";
import Ayah from "./ayah";
import SurahFrame from "./surah-frame";

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
