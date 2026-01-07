import { getArabicNumber } from "@/lib/arabic-numbers";
import { AyahType } from "@/types";

export default function Ayah({ ayah }: { ayah: AyahType }) {
    return (
        <div
            key={ayah.number}
            className="flex shrink-0 gap-2 items-center justify-center"
        >
            <div className="ayah">{ayah.text}</div>
            <div className="frame">{getArabicNumber(ayah.numberInSurah)}</div>
        </div>
    );
}
