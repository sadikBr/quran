import { getArabicNumber } from "@/lib/arabic-numbers";
import { cn } from "@/lib/utils";
import { SurahType } from "@/types";
import Link from "next/link";

export default function SurahFrame({ surah }: { surah: SurahType }) {
    return (
        <div
            className={cn(
                surah.revelationType === "Meccan" ? "bg-primary" : "bg-accent",
            )}
        >
            <Link
                href={`/quran/surah/${surah.number}`}
                className={cn(
                    "flex items-center justify-between px-4 py-6 border-2 text-5xl",
                    surah.revelationType === "Meccan"
                        ? "border-accent"
                        : "border-primary",
                )}
            >
                <p
                    className={cn(
                        "text-lg rounded-full border-2 w-12 flex items-center justify-center aspect-square",
                        surah.revelationType === "Meccan"
                            ? "border-accent"
                            : "border-primary",
                    )}
                >
                    {surah.number}
                </p>

                <div className="text-center">
                    <h2 className="surah-name">
                        {getArabicNumber(surah.number)}
                    </h2>
                    <h2 className="ayah text-xl">{surah.englishName}</h2>
                </div>

                <p className="frame">{getArabicNumber(surah.numberOfAyahs)}</p>
            </Link>
        </div>
    );
}
