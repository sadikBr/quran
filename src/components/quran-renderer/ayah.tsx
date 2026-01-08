import { getArabicNumber } from "@/lib/arabic-numbers";
import { cn } from "@/lib/utils";
import { AyahType } from "@/types";

export default function Ayah({ ayah }: { ayah: AyahType }) {
    return (
        <span className="ayah leading-relaxed text-2xl space-x-2">
            <span className={cn(ayah.sajda ? "text-primary" : "")}>
                {ayah.text}
            </span>
            <span className="frame text-sidebar-accent">
                {getArabicNumber(ayah.numberInSurah)}
            </span>
        </span>
    );
}
