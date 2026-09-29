"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import type { ReadingMode } from "@/features/settings/preferences";
import type { QuranDivisionReference } from "../navigation-types";
import type { SurahType } from "../types";

export type QuranDivisionKind = "juz" | "hizb";

function divisionHref(
    reference: QuranDivisionReference,
    readingMode: ReadingMode,
) {
    if (readingMode === "surah") {
        return `/quran/surah/${reference.surahNumber}#ayah-${reference.globalAyahNumber}`;
    }

    return `/quran/page/${reference.pageNumber}#ayah-${reference.globalAyahNumber}`;
}

export default function QuranDivisionIndex({
    kind,
    references,
    surahs,
    readingMode,
}: {
    kind: QuranDivisionKind;
    references: QuranDivisionReference[];
    surahs: SurahType[];
    readingMode: ReadingMode;
}) {
    const t = useTranslations("Reader.index");
    const locale = useLocale();
    const numberFormatter = new Intl.NumberFormat(locale, {
        minimumIntegerDigits: 2,
        useGrouping: false,
    });
    const surahsByNumber = new Map(
        surahs.map((surah) => [surah.number, surah]),
    );

    return (
        <section aria-labelledby={`${kind}-index-title`}>
            <div className="mb-7 max-w-2xl">
                <h2
                    id={`${kind}-index-title`}
                    className="text-xl font-semibold tracking-tight"
                >
                    {t(`${kind}Title`)}
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {t(`${kind}Description`)}
                </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
                {references.map((reference) => {
                    const surah = surahsByNumber.get(reference.surahNumber);
                    const surahName =
                        locale === "ar" ? surah?.name : surah?.englishName;

                    return (
                        <Link
                            key={reference.number}
                            href={divisionHref(reference, readingMode)}
                            aria-label={t("openDivision", {
                                division: t(kind, {
                                    number: reference.number,
                                }),
                                surah: surahName ?? reference.surahNumber,
                                ayah: reference.ayahNumber,
                            })}
                            className="group grid min-w-0 grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border/70 bg-card px-4 py-5 outline-none transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <span className="text-center text-xl font-semibold text-primary tabular-nums">
                                {numberFormatter.format(reference.number)}
                            </span>
                            <span className="min-w-0">
                                <span className="block text-sm font-semibold text-foreground transition-colors group-hover:text-primary group-focus-visible:text-primary">
                                    {t("beginsAt", {
                                        surah:
                                            surahName ?? reference.surahNumber,
                                        ayah: reference.ayahNumber,
                                    })}
                                </span>
                                <span className="mt-1 block text-xs text-muted-foreground">
                                    {t("page", {
                                        number: reference.pageNumber,
                                    })}
                                </span>
                            </span>
                            <ChevronRight
                                aria-hidden="true"
                                className="size-4 shrink-0 text-muted-foreground/65 transition-[color,transform] group-hover:translate-x-1 group-hover:text-primary group-focus-visible:text-primary rtl:rotate-180 rtl:group-hover:-translate-x-1"
                            />
                        </Link>
                    );
                })}
            </div>
        </section>
    );
}
