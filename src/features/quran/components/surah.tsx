"use client";

import { useTranslations } from "next-intl";
import { Fragment } from "react";
import type { Riwayah } from "@/features/settings/preferences";
import { getArabicNumber } from "@/lib/arabic-numbers";
import { stripBasmalaPrefix } from "../helpers/basmala";
import type { QuranDivisionMarker as QuranDivisionMarkerType } from "../navigation-types";
import type { AyahType, Edition, SurahType } from "../types";
import Ayah from "./ayah";
import SurahBasmala from "./surah-basmala";
import TranslationAyah from "./translation-ayah";

export default function Surah({
    surah,
    ayahs,
    translatedAyahs,
    showTranslation,
    translationEdition,
    highlightAyahs = true,
    divisionMarkers = [],
    showSurahHeading = false,
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
    riwayah?: Riwayah;
}) {
    const t = useTranslations("Reader");
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
            <div className="rtl quran-reading-surface" data-riwayah={riwayah}>
                {beginsAtSurahStart && showSurahHeading && (
                    <header className="mb-4 flex items-center justify-center gap-3 text-primary">
                        <span
                            aria-hidden="true"
                            className="h-px w-8 bg-primary/25"
                        />
                        <h2 className="surah-name text-4xl leading-none sm:text-5xl">
                            {getArabicNumber(surah.number)}
                        </h2>
                        <span
                            aria-hidden="true"
                            className="h-px w-8 bg-primary/25"
                        />
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
                    className="quran-reading-flow mt-0 py-2 text-justify sm:py-3"
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
