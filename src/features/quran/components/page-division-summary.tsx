"use client";

import { useLocale, useTranslations } from "next-intl";
import { getArabicNumber } from "@/lib/arabic-numbers";
import type { QuranNavigationMeta } from "../navigation-types";

// Compare Quran references rather than provider-specific global verse IDs.
export function pageQuarter(navigation: QuranNavigationMeta, page: number) {
    const start = navigation.pages.find(
        (reference) => reference.number === page,
    );
    if (!start) return undefined;
    return navigation.hizbQuarters
        .filter(
            (reference) =>
                reference.surahNumber < start.surahNumber ||
                (reference.surahNumber === start.surahNumber &&
                    reference.ayahNumber <= start.ayahNumber),
        )
        .at(-1)?.number;
}

export default function PageDivisionSummary({
    continuationSurah,
    juzs,
    page,
    navigation,
}: {
    continuationSurah?: { number: number; name: string };
    juzs: number[];
    page: number;
    navigation: QuranNavigationMeta;
}) {
    const t = useTranslations("Reader.divisions");
    const locale = useLocale();
    const lastPage = navigation.pages.at(-1)?.number;
    function adjacent(target: number, label: "previousPage" | "nextPage") {
        const quarter = pageQuarter(navigation, target);
        const boundary =
            target < 1
                ? "mushafStart"
                : lastPage && target > lastPage
                  ? "mushafEnd"
                  : undefined;
        return (
            <div className="min-w-0 text-center">
                <p className="text-[10px] leading-tight text-muted-foreground sm:mb-0.5 sm:text-xs">
                    <span className="sm:hidden">
                        {t(
                            label === "previousPage"
                                ? "previousShort"
                                : "nextShort",
                        )}
                    </span>
                    <span className="hidden sm:inline">{t(label)}</span>
                </p>
                <p className="flex flex-wrap items-center justify-center gap-x-1 text-[11px] leading-snug sm:gap-x-1.5 sm:text-sm">
                    {boundary ? (
                        t(boundary)
                    ) : quarter ? (
                        <>
                            <span>
                                {t("hizb")}{" "}
                                <b className="font-medium text-foreground">
                                    {Math.ceil(quarter / 4)}
                                </b>
                            </span>
                            <span aria-hidden="true" className="text-border">
                                ·
                            </span>
                            <span>
                                <span className="sm:hidden">
                                    {t("summaryQuarter")}
                                </span>
                                <span className="hidden sm:inline">
                                    {t("rub")}
                                </span>{" "}
                                <b
                                    dir="ltr"
                                    className="inline-block font-medium text-foreground"
                                >
                                    {((quarter - 1) % 4) + 1}/4
                                </b>
                            </span>
                        </>
                    ) : (
                        "—"
                    )}
                </p>
            </div>
        );
    }
    return (
        <aside
            aria-label={t("pageSummary")}
            className="mb-1 shrink-0 border-b border-primary/15 px-1 pt-0.5 pb-1.5 text-muted-foreground sm:mb-2 sm:px-2 sm:pt-1 sm:pb-3"
        >
            <div
                dir="ltr"
                className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1fr)] items-center gap-x-2 sm:grid-cols-[1fr_auto_1fr] sm:gap-x-5"
            >
                <div
                    dir={locale === "ar" ? "rtl" : "ltr"}
                    className="min-w-0 justify-self-start"
                >
                    {adjacent(page + 1, "nextPage")}
                </div>
                <div
                    dir={locale === "ar" ? "rtl" : "ltr"}
                    className="flex min-w-0 flex-col items-center justify-center gap-0.5 sm:gap-1"
                >
                    {continuationSurah && (
                        <span
                            role="img"
                            aria-label={continuationSurah.name}
                            className="surah-name quran-surah-summary reader-summary-name leading-none text-primary"
                        >
                            {getArabicNumber(continuationSurah.number)}
                        </span>
                    )}
                    <span className="inline-flex items-baseline gap-1.5 text-xs">
                        {t("juz")}{" "}
                        <span className="text-sm font-semibold text-foreground tabular-nums">
                            {juzs.join(" · ")}
                        </span>
                    </span>
                </div>
                <div
                    dir={locale === "ar" ? "rtl" : "ltr"}
                    className="min-w-0 justify-self-end"
                >
                    {adjacent(page - 1, "previousPage")}
                </div>
            </div>
        </aside>
    );
}
