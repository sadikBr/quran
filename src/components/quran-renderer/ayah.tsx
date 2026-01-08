import { getArabicNumber } from "@/lib/arabic-numbers";
import { AyahType } from "@/types";

export default function Ayah({ ayah }: { ayah: AyahType }) {
    return (
        <span className="ayah leading-relaxed text-2xl space-x-2">
            <span>{ayah.text}</span>
            <span className="frame text-accent">
                {getArabicNumber(ayah.numberInSurah)}
            </span>
        </span>
    );
}
