"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import {
    Combobox,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
} from "@/components/ui/combobox";
import { normalizeSearchText } from "@/features/quran/helpers/normalize-quran-search";
import type {
    QuranDivisionReference,
    QuranNavigationMeta,
} from "@/features/quran/navigation-types";
import { cn } from "@/lib/utils";
import type { QuranReference } from "../types";
import { referenceOrder } from "../types";

export interface SurahOption {
    number: number;
    name: string;
    englishName: string;
    numberOfAyahs: number;
}

interface AyahOption {
    number: number;
}

type RangeUnit = "ayah" | "quarter" | "hizb" | "juz";

export function SurahCombobox({
    options,
    value,
    locale,
    onValueChange,
}: {
    options: SurahOption[];
    value: number;
    locale: string;
    onValueChange: (value: number) => void;
}) {
    const t = useTranslations("Practice.form");
    const selected =
        options.find((surah) => surah.number === value) ?? options[0] ?? null;
    const label = (surah: SurahOption) =>
        `${surah.number}. ${locale === "ar" ? surah.name : surah.englishName}`;

    return (
        <Combobox
            items={options}
            value={selected}
            onValueChange={(surah) => {
                if (surah) onValueChange(surah.number);
            }}
            itemToStringLabel={label}
            itemToStringValue={(surah) => String(surah.number)}
            isItemEqualToValue={(surah, selectedSurah) =>
                surah.number === selectedSurah.number
            }
            filter={(surah, query) =>
                normalizeSearchText(
                    `${surah.number} ${surah.name} ${surah.englishName}`,
                ).includes(normalizeSearchText(query))
            }
            autoHighlight
        >
            <ComboboxInput
                aria-label={t("searchSurah")}
                placeholder={t("searchSurah")}
                className="mt-2 h-12 w-full rounded-xl border-0 bg-background/70 shadow-none ring-1 ring-border/60 focus-within:ring-primary/40"
            />
            <ComboboxContent
                dir={locale === "ar" ? "rtl" : "ltr"}
                className="w-[min(24rem,calc(100vw-2rem))] min-w-0 rounded-xl bg-popover/98 p-1 shadow-xl ring-primary/10 backdrop-blur-md"
            >
                <ComboboxEmpty className="px-4 py-7">
                    {t("noSurahs")}
                </ComboboxEmpty>
                <ComboboxList className="max-h-72 p-1">
                    {(surah: SurahOption) => (
                        <ComboboxItem
                            key={surah.number}
                            value={surah}
                            className="rounded-lg px-3 py-2.5 pe-9 data-highlighted:bg-primary/8"
                        >
                            {label(surah)}
                        </ComboboxItem>
                    )}
                </ComboboxList>
            </ComboboxContent>
        </Combobox>
    );
}

export function AyahCombobox({
    options,
    value,
    onValueChange,
}: {
    options: AyahOption[];
    value: number;
    onValueChange: (value: number) => void;
}) {
    const t = useTranslations("Practice.form");
    const selected =
        options.find((ayah) => ayah.number === value) ?? options[0] ?? null;

    return (
        <Combobox
            items={options}
            value={selected}
            onValueChange={(ayah) => {
                if (ayah) onValueChange(ayah.number);
            }}
            itemToStringLabel={(ayah) => String(ayah.number)}
            itemToStringValue={(ayah) => String(ayah.number)}
            isItemEqualToValue={(ayah, selectedAyah) =>
                ayah.number === selectedAyah.number
            }
            autoHighlight
        >
            <ComboboxInput
                inputMode="numeric"
                aria-label={t("searchAyah")}
                placeholder={t("searchAyah")}
                className="mt-2 h-12 w-full rounded-xl border-0 bg-background/70 shadow-none ring-1 ring-border/60 focus-within:ring-primary/40"
            />
            <ComboboxContent className="w-(--anchor-width) min-w-0 rounded-xl bg-popover/98 p-1 shadow-xl ring-primary/10 backdrop-blur-md">
                <ComboboxEmpty className="px-4 py-7">
                    {t("noAyahs")}
                </ComboboxEmpty>
                <ComboboxList className="max-h-64 p-1">
                    {(ayah: AyahOption) => (
                        <ComboboxItem
                            key={ayah.number}
                            value={ayah}
                            className="rounded-lg px-3 py-2.5 pe-9 data-highlighted:bg-primary/8"
                        >
                            {ayah.number}
                        </ComboboxItem>
                    )}
                </ComboboxList>
            </ComboboxContent>
        </Combobox>
    );
}

function referencesForUnit(
    navigation: QuranNavigationMeta,
    unit: Exclude<RangeUnit, "ayah">,
) {
    if (unit === "juz") return navigation.juzs;
    if (unit === "hizb") return navigation.hizbs;
    return navigation.hizbQuarters;
}

function containingDivision(
    references: QuranDivisionReference[],
    reference: QuranReference,
) {
    let selected = references[0]?.number ?? 1;
    const target = referenceOrder(reference);

    for (const boundary of references) {
        if (
            referenceOrder({
                surahNumber: boundary.surahNumber,
                ayahNumber: boundary.ayahNumber,
            }) > target
        ) {
            break;
        }
        selected = boundary.number;
    }

    return selected;
}

function previousAyah(
    reference: QuranDivisionReference | undefined,
    surahs: SurahOption[],
): QuranReference {
    if (!reference) {
        const finalSurah = surahs.at(-1);
        return {
            surahNumber: finalSurah?.number ?? 114,
            ayahNumber: finalSurah?.numberOfAyahs ?? 6,
        };
    }
    if (reference.ayahNumber > 1) {
        return {
            surahNumber: reference.surahNumber,
            ayahNumber: reference.ayahNumber - 1,
        };
    }

    const previousSurah = surahs.find(
        (surah) => surah.number === reference.surahNumber - 1,
    );
    return {
        surahNumber: previousSurah?.number ?? 1,
        ayahNumber: previousSurah?.numberOfAyahs ?? 1,
    };
}

function DivisionCombobox({
    references,
    value,
    unit,
    minimum = 1,
    onValueChange,
}: {
    references: QuranDivisionReference[];
    value: number;
    unit: Exclude<RangeUnit, "ayah">;
    minimum?: number;
    onValueChange: (number: number) => void;
}) {
    const t = useTranslations("Practice.form");
    const options = references.filter(
        (reference) => reference.number >= minimum,
    );
    const selected =
        options.find((reference) => reference.number === value) ??
        options[0] ??
        null;
    const label = (reference: QuranDivisionReference) =>
        t(`divisionLabels.${unit}`, { number: String(reference.number) });

    return (
        <Combobox
            items={options}
            value={selected}
            onValueChange={(reference) => {
                if (reference) onValueChange(reference.number);
            }}
            itemToStringLabel={label}
            itemToStringValue={(reference) => String(reference.number)}
            isItemEqualToValue={(reference, selectedReference) =>
                reference.number === selectedReference.number
            }
            autoHighlight
        >
            <ComboboxInput
                inputMode="numeric"
                aria-label={t("searchDivision")}
                placeholder={t("searchDivision")}
                className="mt-2 h-12 w-full rounded-xl border-0 bg-background/70 shadow-none ring-1 ring-border/60 focus-within:ring-primary/40"
            />
            <ComboboxContent className="w-[min(18rem,calc(100vw-2rem))] min-w-0 rounded-xl bg-popover/98 p-1 shadow-xl ring-primary/10 backdrop-blur-md">
                <ComboboxEmpty>{t("noDivisions")}</ComboboxEmpty>
                <ComboboxList className="max-h-72 p-1">
                    {(reference: QuranDivisionReference) => (
                        <ComboboxItem
                            key={reference.number}
                            value={reference}
                            className="rounded-lg px-3 py-2.5 pe-9"
                        >
                            {label(reference)}
                        </ComboboxItem>
                    )}
                </ComboboxList>
            </ComboboxContent>
        </Combobox>
    );
}

export default function QuranRangeSelector({
    surahs,
    navigation,
    locale,
    start,
    end,
    onChange,
}: {
    surahs: SurahOption[];
    navigation: QuranNavigationMeta;
    locale: string;
    start: QuranReference;
    end: QuranReference;
    onChange: (range: { start: QuranReference; end: QuranReference }) => void;
}) {
    const t = useTranslations("Practice.form");
    const [unit, setUnit] = useState<RangeUnit>("ayah");
    const startSurah = surahs.find(
        (surah) => surah.number === start.surahNumber,
    );
    const endSurah = surahs.find((surah) => surah.number === end.surahNumber);
    const availableEndSurahs = surahs.filter(
        (surah) => surah.number >= start.surahNumber,
    );
    const minimumEndAyah =
        end.surahNumber === start.surahNumber ? start.ayahNumber : 1;

    function alignToDivisions(nextUnit: Exclude<RangeUnit, "ayah">) {
        const references = referencesForUnit(navigation, nextUnit);
        const startNumber = containingDivision(references, start);
        const endNumber = Math.max(
            startNumber,
            containingDivision(references, end),
        );
        const startReference = references[startNumber - 1];
        onChange({
            start: {
                surahNumber: startReference?.surahNumber ?? 1,
                ayahNumber: startReference?.ayahNumber ?? 1,
            },
            end: previousAyah(references[endNumber], surahs),
        });
    }

    function changeUnit(nextUnit: RangeUnit) {
        setUnit(nextUnit);
        if (nextUnit !== "ayah") alignToDivisions(nextUnit);
    }

    function changeDivision(
        nextUnit: Exclude<RangeUnit, "ayah">,
        nextStart: number,
        nextEnd: number,
    ) {
        const references = referencesForUnit(navigation, nextUnit);
        const safeEnd = Math.max(nextStart, nextEnd);
        const startReference = references[nextStart - 1];
        onChange({
            start: {
                surahNumber: startReference?.surahNumber ?? 1,
                ayahNumber: startReference?.ayahNumber ?? 1,
            },
            end: previousAyah(references[safeEnd], surahs),
        });
    }

    const divisionReferences =
        unit === "ayah" ? [] : referencesForUnit(navigation, unit);
    const startDivision =
        unit === "ayah" ? 1 : containingDivision(divisionReferences, start);
    const endDivision =
        unit === "ayah"
            ? 1
            : Math.max(
                  startDivision,
                  containingDivision(divisionReferences, end),
              );

    return (
        <div className="space-y-5">
            <fieldset>
                <legend className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                    {t("rangeUnitLabel")}
                </legend>
                <div className="mt-3 grid grid-cols-2 gap-1.5 rounded-2xl bg-muted/55 p-1.5 sm:grid-cols-4">
                    {(["ayah", "quarter", "hizb", "juz"] as const).map(
                        (option) => (
                            <button
                                key={option}
                                type="button"
                                onClick={() => changeUnit(option)}
                                className={cn(
                                    "min-h-11 cursor-pointer rounded-xl px-3 text-sm font-semibold transition-colors",
                                    unit === option
                                        ? "bg-background text-primary shadow-sm"
                                        : "text-muted-foreground hover:text-foreground",
                                )}
                            >
                                {t(`rangeUnits.${option}`)}
                            </button>
                        ),
                    )}
                </div>
            </fieldset>

            {unit === "ayah" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                    {[
                        {
                            key: "start" as const,
                            value: start,
                            surah: startSurah,
                            surahOptions: surahs,
                            minimumAyah: 1,
                        },
                        {
                            key: "end" as const,
                            value: end,
                            surah: endSurah,
                            surahOptions: availableEndSurahs,
                            minimumAyah: minimumEndAyah,
                        },
                    ].map((field) => (
                        <fieldset
                            key={field.key}
                            className="rounded-2xl bg-muted/35 p-4 ring-1 ring-border/40 sm:p-5"
                        >
                            <legend className="px-2 text-sm font-semibold text-primary">
                                {t(`${field.key}.title`)}
                            </legend>
                            <div className="mt-1 text-xs font-medium text-muted-foreground">
                                <p>{t("surah")}</p>
                                <SurahCombobox
                                    options={field.surahOptions}
                                    value={field.value.surahNumber}
                                    locale={locale}
                                    onValueChange={(surahNumber) => {
                                        const next = {
                                            surahNumber,
                                            ayahNumber:
                                                field.key === "end" &&
                                                surahNumber ===
                                                    start.surahNumber
                                                    ? start.ayahNumber
                                                    : 1,
                                        };
                                        if (field.key === "start") {
                                            onChange({
                                                start: next,
                                                end:
                                                    referenceOrder(end) <
                                                    referenceOrder(next)
                                                        ? next
                                                        : end,
                                            });
                                        } else {
                                            onChange({ start, end: next });
                                        }
                                    }}
                                />
                            </div>
                            <div className="mt-4 text-xs font-medium text-muted-foreground">
                                <p>{t("ayah")}</p>
                                <AyahCombobox
                                    options={Array.from(
                                        {
                                            length: Math.max(
                                                0,
                                                (field.surah?.numberOfAyahs ??
                                                    0) -
                                                    field.minimumAyah +
                                                    1,
                                            ),
                                        },
                                        (_, index) => ({
                                            number: field.minimumAyah + index,
                                        }),
                                    )}
                                    value={field.value.ayahNumber}
                                    onValueChange={(ayahNumber) => {
                                        const next = {
                                            ...field.value,
                                            ayahNumber,
                                        };
                                        if (field.key === "start") {
                                            onChange({
                                                start: next,
                                                end:
                                                    referenceOrder(end) <
                                                    referenceOrder(next)
                                                        ? next
                                                        : end,
                                            });
                                        } else {
                                            onChange({ start, end: next });
                                        }
                                    }}
                                />
                            </div>
                        </fieldset>
                    ))}
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                    <fieldset className="rounded-2xl bg-muted/35 p-4 ring-1 ring-border/40 sm:p-5">
                        <legend className="px-2 text-sm font-semibold text-primary">
                            {t("start.title")}
                        </legend>
                        <DivisionCombobox
                            references={divisionReferences}
                            value={startDivision}
                            unit={unit}
                            onValueChange={(number) =>
                                changeDivision(unit, number, endDivision)
                            }
                        />
                    </fieldset>
                    <fieldset className="rounded-2xl bg-muted/35 p-4 ring-1 ring-border/40 sm:p-5">
                        <legend className="px-2 text-sm font-semibold text-primary">
                            {t("end.title")}
                        </legend>
                        <DivisionCombobox
                            references={divisionReferences}
                            value={endDivision}
                            unit={unit}
                            minimum={startDivision}
                            onValueChange={(number) =>
                                changeDivision(unit, startDivision, number)
                            }
                        />
                    </fieldset>
                </div>
            )}
        </div>
    );
}
