import Link from "next/link";
import { getArabicNumber } from "@/lib/arabic-numbers";
import { cn } from "@/lib/utils";
import type { SurahType } from "../types";

export default function SurahFrame({
    surah,
    activateLink,
}: {
    surah: SurahType;
    activateLink: boolean;
}) {
    const content = (
        <>
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
                <h2 className="surah-name text-7xl">
                    {getArabicNumber(surah.number)}
                </h2>
                <h2 className="ayah text-xl">{surah.englishName}</h2>
            </div>

            <p className="frame">{getArabicNumber(surah.numberOfAyahs)}</p>
        </>
    );

    return (
        <div
            className={cn(
                "mb-4 ltr",
                surah.revelationType === "Meccan" ? "bg-primary" : "bg-accent",
            )}
        >
            {activateLink ? (
                <Link
                    href={activateLink ? `/quran/surah/${surah.number}` : ""}
                    className={cn(
                        "flex items-center justify-between px-4 py-2 border-2 text-5xl",
                        surah.revelationType === "Meccan"
                            ? "border-accent text-accent"
                            : "border-primary text-primary",
                    )}
                >
                    {content}
                </Link>
            ) : (
                <div
                    className={cn(
                        "flex items-center justify-between px-4 py-2 border-2 text-5xl",
                        surah.revelationType === "Meccan"
                            ? "border-accent text-accent"
                            : "border-primary text-primary",
                    )}
                >
                    {content}
                </div>
            )}
        </div>
    );
}
