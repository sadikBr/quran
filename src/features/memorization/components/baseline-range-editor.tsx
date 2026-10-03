"use client";

import { Plus, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    SurahCombobox,
    type SurahOption,
} from "@/features/practice/components/quran-range-selector";
import { type BaselineRange, normalizeBaselineRanges } from "../progress";

export function baselineRangeKey(range: BaselineRange) {
    return `${range.surahNumber}:${range.startAyahNumber}-${range.endAyahNumber}`;
}

export default function BaselineRangeEditor({
    surahs,
    ranges,
    disabled,
    onChange,
    label,
}: {
    surahs: SurahOption[];
    ranges: BaselineRange[];
    disabled: boolean;
    onChange: (ranges: BaselineRange[]) => void;
    label: (range: BaselineRange) => string;
}) {
    const t = useTranslations("Memorization.record");
    const locale = useLocale();
    const [surahNumber, setSurahNumber] = useState(1);
    const [whole, setWhole] = useState(true);
    const [start, setStart] = useState("1");
    const [end, setEnd] = useState("1");
    const [notice, setNotice] = useState("");
    const surah = surahs.find((item) => item.number === surahNumber);
    const first = whole ? 1 : Number(start);
    const last = whole ? (surah?.numberOfAyahs ?? 0) : Number(end);
    const valid = Boolean(
        surah &&
            Number.isInteger(first) &&
            Number.isInteger(last) &&
            first >= 1 &&
            last >= first &&
            last <= surah.numberOfAyahs,
    );
    const invalid = !whole && !valid;
    function add() {
        if (disabled || !valid) return;
        const next = normalizeBaselineRanges([
            ...ranges,
            { surahNumber, startAyahNumber: first, endAyahNumber: last },
        ]);
        const same =
            next.length === ranges.length &&
            next.every(
                (r, i) => baselineRangeKey(r) === baselineRangeKey(ranges[i]),
            );
        setNotice(t(same ? "alreadySelected" : "passageAdded"));
        if (!same) onChange(next);
    }
    return (
        <section
            className="app-card space-y-5 p-5"
            aria-labelledby="baseline-passages-title"
        >
            <div className="space-y-2">
                <h3 id="baseline-passages-title" className="font-semibold">
                    {t("surahsAndAyahs")}
                </h3>
                <p className="text-sm leading-7 text-muted-foreground">
                    {t("passagesHint")}
                </p>
            </div>
            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    add();
                }}
            >
                <fieldset disabled={disabled} className="min-w-0 space-y-4">
                    <legend className="sr-only">{t("addPassage")}</legend>
                    <SurahCombobox
                        options={surahs}
                        value={surahNumber}
                        locale={locale}
                        onValueChange={(number) => {
                            setSurahNumber(number);
                            setStart("1");
                            setEnd("1");
                            setNotice("");
                        }}
                    />
                    <fieldset
                        className="flex flex-wrap gap-2"
                        aria-label={t("passageExtent")}
                    >
                        <Button
                            type="button"
                            variant={whole ? "default" : "outline"}
                            aria-pressed={whole}
                            onClick={() => {
                                setWhole(true);
                                setNotice("");
                            }}
                        >
                            {t("wholeSurah")}
                        </Button>
                        <Button
                            type="button"
                            variant={!whole ? "default" : "outline"}
                            aria-pressed={!whole}
                            onClick={() => {
                                setWhole(false);
                                setNotice("");
                            }}
                        >
                            {t("ayahRange")}
                        </Button>
                    </fieldset>
                    {!whole && (
                        <div className="grid grid-cols-2 gap-3">
                            <label
                                className="space-y-2 text-sm"
                                htmlFor="baseline-start-ayah"
                            >
                                <span>{t("fromAyah")}</span>
                                <Input
                                    id="baseline-start-ayah"
                                    type="number"
                                    min={1}
                                    max={surah?.numberOfAyahs}
                                    value={start}
                                    onChange={(event) =>
                                        setStart(event.target.value)
                                    }
                                    required
                                    aria-invalid={invalid}
                                    aria-describedby="baseline-range-hint"
                                />
                            </label>
                            <label
                                className="space-y-2 text-sm"
                                htmlFor="baseline-end-ayah"
                            >
                                <span>{t("toAyah")}</span>
                                <Input
                                    id="baseline-end-ayah"
                                    type="number"
                                    min={Math.max(1, Number(start) || 1)}
                                    max={surah?.numberOfAyahs}
                                    value={end}
                                    onChange={(event) =>
                                        setEnd(event.target.value)
                                    }
                                    required
                                    aria-invalid={invalid}
                                    aria-describedby="baseline-range-hint"
                                />
                            </label>
                            <p
                                id="baseline-range-hint"
                                className={`col-span-2 text-xs leading-6 ${invalid ? "text-destructive" : "text-muted-foreground"}`}
                            >
                                {t("validAyahs", {
                                    count: surah?.numberOfAyahs ?? 0,
                                })}
                            </p>
                        </div>
                    )}
                    <Button
                        type="submit"
                        variant="outline"
                        disabled={disabled || !valid}
                    >
                        <Plus aria-hidden="true" className="size-4" />
                        {t("addPassage")}
                    </Button>
                    {notice && (
                        <output
                            className="block text-sm text-primary"
                            aria-live="polite"
                        >
                            {notice}
                        </output>
                    )}
                </fieldset>
            </form>
            <div className="space-y-3 border-t border-border/50 pt-4">
                <h4 className="text-sm font-medium">{t("selectedPassages")}</h4>
                {!ranges.length ? (
                    <p className="text-sm text-muted-foreground">
                        {t("noPassages")}
                    </p>
                ) : (
                    <ul className="space-y-2">
                        {ranges.map((range) => (
                            <li
                                key={baselineRangeKey(range)}
                                className="flex items-center justify-between gap-3 rounded-xl bg-primary/5 px-3 py-2"
                            >
                                <span className="text-sm leading-7">
                                    {label(range)}
                                </span>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    disabled={disabled}
                                    aria-label={t("removePassage", {
                                        passage: label(range),
                                    })}
                                    onClick={() => {
                                        onChange(
                                            ranges.filter(
                                                (item) =>
                                                    baselineRangeKey(item) !==
                                                    baselineRangeKey(range),
                                            ),
                                        );
                                        setNotice("");
                                    }}
                                >
                                    <X aria-hidden="true" className="size-4" />
                                </Button>
                            </li>
                        ))}
                    </ul>
                )}
                <p className="text-xs leading-6 text-muted-foreground">
                    {t("overlapHint")}
                </p>
            </div>
        </section>
    );
}
