"use client";

import { useTranslations } from "next-intl";
import { Fragment } from "react";
import type { Riwayah } from "@/features/settings/preferences";
import { useSettings } from "@/features/settings/settings-provider";
import { getArabicNumber } from "@/lib/arabic-numbers";
import { stripBasmalaPrefix } from "../helpers/basmala";
import type { QuranDivisionMarker as QuranDivisionMarkerType } from "../navigation-types";
import type { AyahType, Edition, SurahType } from "../types";
import Ayah from "./ayah";
import SurahBasmala from "./surah-basmala";
import TranslationAyah from "./translation-ayah";

export function SurahDetail({
    label,
    value,
}: {
    label: string;
    value: number;
}) {
    return (
        <span className="relative flex size-10 shrink-0 items-center justify-center sm:size-12">
            <span
                aria-hidden="true"
                className="absolute size-7 rotate-45 rounded-[3px] border border-primary/30 bg-primary/[0.035] sm:size-8"
            />
            <span
                dir="ltr"
                className="relative font-sans text-[11px] font-medium leading-none text-primary tabular-nums sm:text-xs"
            >
                {String(value).padStart(2, "0")}
            </span>
            <span className="sr-only">{label}</span>
        </span>
    );
}

export default function Surah({
    surah,
    ayahs,
    translatedAyahs,
    showTranslation,
    translationEdition,
    highlightAyahs = true,
    divisionMarkers = [],
    showSurahHeading = false,
    showSurahDetails = false,
    riwayah = "hafs",
}: {
    surah: SurahType;
    ayahs: AyahType[];
    translatedAyahs: AyahType[];
    showTranslation: boolean;
    translationEdition?: Edition;
    highlightAyahs?: boolean;
    divisionMarkers?: QuranDivisionMarkerType[];
    showSurahHeading?: boolean;
    showSurahDetails?: boolean;
    riwayah?: Riwayah;
}) {
    const t = useTranslations("Reader");
    const { arabicEdition } = useSettings();
    const presentation =
        riwayah === "warsh"
            ? undefined
            : arabicEdition === "quranpedia.mushaf.2"
              ? "verses"
              : "mushaf";
    const beginsAtSurahStart = ayahs[0]?.numberInSurah === 1;
    const hasUnnumberedFatihaBasmala =
        beginsAtSurahStart &&
        surah.number === 1 &&
        ayahs[0]?.isBasmalaSentinel === true;
    const fatihaAyah =
        beginsAtSurahStart && surah.number === 1 && !hasUnnumberedFatihaBasmala
            ? ayahs[0]
            : undefined;
    const readingAyahs = hasUnnumberedFatihaBasmala
        ? ayahs.slice(1)
        : fatihaAyah
          ? ayahs.slice(1)
          : ayahs.map((ayah, index) =>
                beginsAtSurahStart && index === 0
                    ? { ...ayah, text: stripBasmalaPrefix(ayah.text) }
                    : ayah,
            );
    const markerByAyah = new Map(
        divisionMarkers.map((marker) => [marker.globalAyahNumber, marker]),
    );
    const leadingMarker = beginsAtSurahStart
        ? markerByAyah.get(ayahs[0]?.number)
        : undefined;

    return (
        <>
            <div
                className="rtl quran-reading-surface"
                data-riwayah={riwayah}
                data-presentation={presentation}
                data-surah-heading={
                    beginsAtSurahStart && showSurahHeading ? "true" : undefined
                }
            >
                {beginsAtSurahStart && showSurahHeading && (
                    <header
                        dir="rtl"
                        className="mx-auto mt-2 mb-0 flex w-fit max-w-full items-center justify-center gap-2 text-primary sm:gap-3"
                    >
                        {showSurahDetails && (
                            <SurahDetail
                                label={t("surah.number")}
                                value={surah.number}
                            />
                        )}
                        <span
                            aria-hidden="true"
                            className="h-px w-6 shrink bg-gradient-to-r from-transparent to-primary/25 sm:w-9"
                        />
                        <h2
                            aria-label={surah.name}
                            className="surah-name quran-surah-heading shrink-0 leading-none"
                        >
                            {getArabicNumber(surah.number)}
                        </h2>
                        <span
                            aria-hidden="true"
                            className="h-px w-6 shrink bg-gradient-to-l from-transparent to-primary/25 sm:w-9"
                        />
                        {showSurahDetails && (
                            <SurahDetail
                                label={t("surah.ayahCount")}
                                value={surah.numberOfAyahs}
                            />
                        )}
                    </header>
                )}
                {beginsAtSurahStart && (
                    <SurahBasmala
                        surahNumber={surah.number}
                        fatihaAyah={fatihaAyah}
                        playbackAyahNumber={
                            hasUnnumberedFatihaBasmala
                                ? ayahs[0]?.audioNumber
                                : undefined
                        }
                        divisionMarker={fatihaAyah ? leadingMarker : undefined}
                        highlightEnabled={highlightAyahs}
                        riwayah={riwayah}
                    />
                )}
                <div
                    dir="rtl"
                    lang="ar"
                    className="quran-reading-flow quran-reader-text mt-0 py-2 text-justify sm:py-3"
                    style={{ textAlignLast: "center" }}
                >
                    {readingAyahs.map((ayah) => {
                        const marker = markerByAyah.get(ayah.number);

                        return (
                            <Fragment
                                key={`${ayah.number}-${ayah.numberInSurah}`}
                            >
                                <Ayah
                                    ayah={ayah}
                                    surahNumber={surah.number}
                                    divisionMarker={marker}
                                    riwayah={riwayah}
                                    highlightEnabled={highlightAyahs}
                                    hidePrintedDivisionMarker={
                                        marker?.hizbQuarterNumber !== undefined
                                    }
                                />
                            </Fragment>
                        );
                    })}
                </div>
            </div>
            {showTranslation && (
                <section
                    aria-labelledby={`translation-${surah.number}`}
                    className="ltr mt-8 mb-10"
                >
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <p className="text-[0.65rem] font-semibold tracking-[0.18em] text-primary uppercase">
                                {t("translation.eyebrow")}
                            </p>
                            <h2
                                id={`translation-${surah.number}`}
                                className="mt-1 text-lg font-semibold tracking-tight text-foreground"
                            >
                                {t("translation.title")}
                            </h2>
                        </div>
                        <p className="rounded-full bg-muted/55 px-3 py-1.5 text-xs text-muted-foreground">
                            {translationEdition?.englishName ??
                                translationEdition?.name ??
                                t("translation.fallback")}
                        </p>
                    </div>
                    <div className="mt-5 space-y-1 text-[0.95rem] leading-7 text-foreground/85 sm:text-base sm:leading-8">
                        {translatedAyahs.map((ayah) => (
                            <TranslationAyah key={ayah.number} ayah={ayah} />
                        ))}
                    </div>
                </section>
            )}
        </>
    );
}
