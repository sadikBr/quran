"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { getArabicNumber } from "@/lib/arabic-numbers";
import { cn } from "@/lib/utils";
import type { SurahType } from "../types";

export default function SurahFrame({
    surah,
    href,
    compact = false,
}: {
    surah: SurahType;
    href?: string;
    compact?: boolean;
}) {
    const t = useTranslations("Reader");
    const locale = useLocale();
    const isArabic = locale === "ar";
    const numberFormatter = new Intl.NumberFormat(locale, {
        useGrouping: false,
    });
    const isMeccan = surah.revelationType === "Meccan";
    const backgroundImage = isMeccan
        ? "/meccan-surah-background-v2.webp"
        : "/medinan-surah-background-v2.webp";
    const revelationLabel = t(isMeccan ? "surah.meccan" : "surah.medinan");

    const content = (
        <>
            <span className="w-8 shrink-0 text-center text-lg font-bold text-primary tabular-nums drop-shadow-sm transition-transform group-hover:scale-105 sm:w-10 sm:text-xl">
                {numberFormatter.format(surah.number)}
            </span>

            <div
                className={cn(
                    "min-w-0 flex-1",
                    compact ? "text-start" : "text-center",
                )}
            >
                <h2
                    aria-label={surah.name}
                    className="surah-name text-4xl leading-none text-card-foreground sm:text-5xl"
                >
                    {getArabicNumber(surah.number)}
                </h2>
                <p
                    className={cn(
                        "mt-1.5 flex min-w-0 flex-wrap items-center gap-x-1.5 text-xs font-medium text-muted-foreground sm:text-[0.8rem]",
                        !compact && "justify-center",
                    )}
                >
                    {!isArabic && (
                        <>
                            <span className="font-semibold text-card-foreground">
                                {surah.englishName}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{surah.englishNameTranslation}</span>
                            <span aria-hidden="true">·</span>
                        </>
                    )}
                    <span>{revelationLabel}</span>
                    <span aria-hidden="true">·</span>
                    <span>
                        {numberFormatter.format(surah.numberOfAyahs)}{" "}
                        {t("surah.ayahs")}
                    </span>
                </p>
            </div>

            {href && (
                <ChevronRight
                    aria-hidden="true"
                    className="size-4 shrink-0 text-card-foreground/65 transition-[color,transform] group-hover:translate-x-0.5 group-hover:text-primary rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
                />
            )}
        </>
    );

    return (
        <div
            className={cn(
                "relative overflow-hidden rounded-xl border border-border/70 bg-card transition-colors hover:border-primary/40",
                !compact && "mb-3",
            )}
        >
            {!compact && (
                <span
                    aria-hidden="true"
                    className={cn(
                        "surah-frame-background pointer-events-none absolute inset-0 bg-[position:center_58%] bg-no-repeat opacity-[0.32] dark:opacity-[0.72] md:bg-bottom",
                        isMeccan ? "bg-primary/3" : "bg-accent/20",
                    )}
                    style={{ backgroundImage: `url(${backgroundImage})` }}
                />
            )}
            {!compact && (
                <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-gradient-to-r from-card/80 via-card/40 to-card/80 dark:from-background/55 dark:via-background/25 dark:to-background/55"
                />
            )}
            {href ? (
                <Link
                    href={href}
                    className={cn(
                        "group relative z-10 flex h-full items-center gap-3 px-4 py-4 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:gap-4 sm:px-5",
                        isMeccan ? "hover:bg-primary/5" : "hover:bg-accent/40",
                    )}
                >
                    {content}
                </Link>
            ) : (
                <div
                    className={cn(
                        "relative z-10 flex items-center gap-3 px-4 py-3 sm:gap-4 sm:px-5 sm:py-3.5",
                        isMeccan ? "bg-primary/5" : "bg-accent/30",
                    )}
                >
                    {content}
                </div>
            )}
        </div>
    );
}
