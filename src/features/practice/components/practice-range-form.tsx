"use client";

import { BookMarked, RefreshCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
    Combobox,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
} from "@/components/ui/combobox";
import { normalizeSearchText } from "@/features/quran/helpers/normalize-quran-search";
import { cn } from "@/lib/utils";
import savePracticeAssignment from "../server/save-practice-assignment";
import {
    type PracticeAssignment,
    type PracticeKind,
    referenceOrder,
} from "../types";

export interface SurahOption {
    number: number;
    name: string;
    englishName: string;
    numberOfAyahs: number;
}

export interface AyahOption {
    number: number;
}

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

export default function PracticeRangeForm({
    surahs,
    assignments,
    locale,
}: {
    surahs: SurahOption[];
    assignments: PracticeAssignment[];
    locale: string;
}) {
    const router = useRouter();
    const t = useTranslations("Practice.form");
    const initialAssignment =
        assignments.find((item) => item.kind === "memorization") ??
        assignments[0];
    const [kind, setKind] = useState<PracticeKind>(
        initialAssignment?.kind ?? "memorization",
    );
    const [start, setStart] = useState(
        initialAssignment?.start ?? { surahNumber: 1, ayahNumber: 1 },
    );
    const [end, setEnd] = useState(
        initialAssignment?.end ?? { surahNumber: 1, ayahNumber: 7 },
    );
    const [isSaving, setIsSaving] = useState(false);
    const startSurah = surahs.find(
        (surah) => surah.number === start.surahNumber,
    );
    const endSurah = surahs.find((surah) => surah.number === end.surahNumber);
    const availableEndSurahs = surahs.filter(
        (surah) => surah.number >= start.surahNumber,
    );
    const minimumEndAyah =
        end.surahNumber === start.surahNumber ? start.ayahNumber : 1;
    const activeAssignment = assignments.find((item) => item.kind === kind);

    function changeKind(nextKind: PracticeKind) {
        setKind(nextKind);
        const savedAssignment = assignments.find(
            (item) => item.kind === nextKind,
        );
        setStart(savedAssignment?.start ?? { surahNumber: 1, ayahNumber: 1 });
        setEnd(savedAssignment?.end ?? { surahNumber: 1, ayahNumber: 7 });
    }

    function changeStartSurah(surahNumber: number) {
        const nextStart = { surahNumber, ayahNumber: 1 };
        setStart(nextStart);
        if (referenceOrder(end) < referenceOrder(nextStart)) {
            setEnd(nextStart);
        }
    }

    function changeStartAyah(ayahNumber: number) {
        const nextStart = { ...start, ayahNumber };
        setStart(nextStart);
        if (referenceOrder(end) < referenceOrder(nextStart)) {
            setEnd(nextStart);
        }
    }

    async function save() {
        setIsSaving(true);
        const result = await savePracticeAssignment({ kind, start, end });
        setIsSaving(false);

        if (!result.success) {
            toast.error(t("error"));
            return;
        }

        toast.success(t("success"));
        router.refresh();
    }

    return (
        <form
            className="mt-7 space-y-7"
            onSubmit={(event) => {
                event.preventDefault();
                save();
            }}
        >
            <fieldset>
                <legend className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                    {t("kindLabel")}
                </legend>
                <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl bg-muted/55 p-1.5">
                    {(["memorization", "revision"] as const).map((option) => {
                        const Icon =
                            option === "memorization" ? BookMarked : RefreshCcw;
                        return (
                            <button
                                key={option}
                                type="button"
                                onClick={() => changeKind(option)}
                                className={cn(
                                    "flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors",
                                    kind === option
                                        ? "bg-background text-primary shadow-sm"
                                        : "text-muted-foreground hover:text-foreground",
                                )}
                            >
                                <Icon aria-hidden="true" className="size-4" />
                                {t(`kinds.${option}`)}
                            </button>
                        );
                    })}
                </div>
            </fieldset>

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
                                    if (field.key === "start") {
                                        changeStartSurah(surahNumber);
                                    } else {
                                        setEnd({
                                            surahNumber,
                                            ayahNumber:
                                                surahNumber ===
                                                start.surahNumber
                                                    ? start.ayahNumber
                                                    : 1,
                                        });
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
                                            (field.surah?.numberOfAyahs ?? 0) -
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
                                    if (field.key === "start") {
                                        changeStartAyah(ayahNumber);
                                    } else {
                                        setEnd({ ...end, ayahNumber });
                                    }
                                }}
                            />
                        </div>
                    </fieldset>
                ))}
            </div>

            <div className="flex justify-end">
                <Button
                    type="submit"
                    disabled={isSaving}
                    className="min-h-11 min-w-44 rounded-xl"
                >
                    {isSaving
                        ? t("saving")
                        : activeAssignment
                          ? t("update")
                          : t("create")}
                </Button>
            </div>
        </form>
    );
}
