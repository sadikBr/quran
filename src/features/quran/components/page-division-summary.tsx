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
                <p className="mb-0.5 text-[10px] text-muted-foreground sm:text-xs">
                    {t(label)}
                </p>
                <p className="flex flex-wrap items-center justify-center gap-x-1.5 text-xs sm:text-sm">
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
                                {t("rub")}{" "}
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
            className="mb-2 shrink-0 border-b border-primary/15 px-1 pt-1 pb-3 text-muted-foreground sm:px-2"
        >
            <div
                dir="ltr"
                className="grid grid-cols-2 items-center gap-x-2 gap-y-2 sm:grid-cols-[1fr_auto_1fr] sm:gap-x-5"
            >
                <div
                    dir={locale === "ar" ? "rtl" : "ltr"}
                    className="col-start-1 row-start-2 justify-self-start sm:row-start-1"
                >
                    {adjacent(page + 1, "nextPage")}
                </div>
                <div
                    dir={locale === "ar" ? "rtl" : "ltr"}
                    className="col-span-2 col-start-1 row-start-1 flex flex-col items-center justify-center gap-1 sm:col-span-1 sm:col-start-2"
                >
                    {continuationSurah && (
                        <span
                            role="img"
                            aria-label={continuationSurah.name}
                            className="surah-name quran-surah-summary leading-none text-primary"
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
                    className="col-start-2 row-start-2 justify-self-end sm:col-start-3 sm:row-start-1"
                >
                    {adjacent(page - 1, "previousPage")}
                </div>
            </div>
        </aside>
    );
}
