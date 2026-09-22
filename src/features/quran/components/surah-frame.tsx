import { ChevronRight } from "lucide-react";
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
    const isMeccan = surah.revelationType === "Meccan";

    const content = (
        <>
            <span
                className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                    isMeccan
                        ? "bg-primary text-primary-foreground"
                        : "bg-accent text-accent-foreground",
                )}
            >
                {surah.number}
            </span>

            <div className="min-w-0 flex-1 text-center">
                <h2 className="surah-name text-5xl leading-none text-foreground sm:text-6xl">
                    {getArabicNumber(surah.number)}
                </h2>
                <p className="mt-2 truncate text-sm font-semibold text-foreground">
                    {surah.englishName}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {surah.englishNameTranslation}
                </p>
            </div>

            <div className="flex shrink-0 items-center gap-2 text-right">
                <div>
                    <p className="text-sm font-semibold text-foreground">
                        {surah.numberOfAyahs}
                    </p>
                    <p className="text-xs text-muted-foreground">Ayahs</p>
                </div>
                {activateLink && (
                    <ChevronRight
                        aria-hidden="true"
                        className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                    />
                )}
            </div>
        </>
    );

    return (
        <div
            className={cn(
                "mb-3 overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow",
                activateLink && "hover:shadow-md",
            )}
        >
            {activateLink ? (
                <Link
                    href={`/quran/surah/${surah.number}`}
                    className={cn(
                        "group flex items-center gap-4 px-4 py-4 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                        isMeccan ? "hover:bg-primary/5" : "hover:bg-accent/40",
                    )}
                >
                    {content}
                </Link>
            ) : (
                <div
                    className={cn(
                        "flex items-center gap-4 px-4 py-4",
                        isMeccan ? "bg-primary/5" : "bg-accent/30",
                    )}
                >
                    {content}
                </div>
            )}
        </div>
    );
}
