import { cn } from "@/lib/utils";
import { getBasmalaText } from "../helpers/basmala";
import type { AyahType } from "../types";
import Ayah from "./ayah";

export default function SurahBasmala({
    surahNumber,
    fatihaAyah,
}: {
    surahNumber: number;
    fatihaAyah?: AyahType;
}) {
    if (surahNumber === 9) return null;

    if (!fatihaAyah) {
        return (
            <div
                dir="rtl"
                lang="ar"
                className="my-2 flex items-center justify-center text-3xl leading-[1.45] text-foreground sm:my-3 sm:text-4xl"
            >
                <span className="ayah inline-block leading-[1.45]">
                    {getBasmalaText()}
                </span>
            </div>
        );
    }

    return (
        <div
            dir="rtl"
            lang="ar"
            className={cn(
                "ayah text-center text-3xl leading-[1.55] text-foreground sm:text-4xl",
                fatihaAyah ? "mt-3 mb-0" : "my-4 sm:my-5",
            )}
        >
            <Ayah ayah={fatihaAyah} surahNumber={surahNumber} />
        </div>
    );
}
