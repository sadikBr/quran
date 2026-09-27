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

            <div className="grid border-t border-border/70 md:grid-cols-2 md:[&>*:nth-child(odd)]:border-e">
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
                            className="group flex min-w-0 items-center gap-4 border-b border-border/70 px-2 py-4 outline-none transition-colors hover:bg-muted/35 focus-visible:bg-muted/45 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-4"
                        >
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                                {reference.number.toLocaleString(locale)}
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block font-semibold text-foreground">
                                    {t(kind, { number: reference.number })}
                                </span>
                                <span className="mt-1 block truncate text-xs text-muted-foreground">
                                    {t("beginsAt", {
                                        surah:
                                            surahName ?? reference.surahNumber,
                                        ayah: reference.ayahNumber,
                                    })}
                                </span>
                            </span>
                            <span className="shrink-0 text-end">
                                <span className="block text-xs font-medium text-foreground">
                                    {t("page", {
                                        number: reference.pageNumber,
                                    })}
                                </span>
                                <ChevronRight
                                    aria-hidden="true"
                                    className="ms-auto mt-1 size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
                                />
                            </span>
                        </Link>
                    );
                })}
            </div>
        </section>
    );
}
