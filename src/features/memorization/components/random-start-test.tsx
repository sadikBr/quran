"use client";

import { Eye, LoaderCircle, Minus, Plus, Shuffle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import QuranRangeSelector, {
    type SurahOption,
} from "@/features/practice/components/quran-range-selector";
import type { QuranNavigationMeta } from "@/features/quran/navigation-types";
import { getArabicNumber } from "@/lib/arabic-numbers";
import getRandomStart from "../server/get-random-start";

export default function RandomStartTest({
    surahs,
    navigation,
    locale,
    completedCount,
}: {
    surahs: SurahOption[];
    navigation: QuranNavigationMeta;
    locale: string;
    completedCount: number;
}) {
    const t = useTranslations("Memorization.test");
    const [custom, setCustom] = useState(false);
    const [continuationCount, setContinuationCount] = useState(5);
    const [range, setRange] = useState({
        start: { surahNumber: 1, ayahNumber: 1 },
        end: { surahNumber: 1, ayahNumber: 7 },
    });
    const [result, setResult] =
        useState<Awaited<ReturnType<typeof getRandomStart>>["result"]>();
    const [revealed, setRevealed] = useState(false);
    const [pending, setPending] = useState(false);
    const [error, setError] = useState("");
    const busy = useRef(false);
    function changeCount(value: number) {
        setContinuationCount(Math.max(1, Math.min(30, value)));
        setResult(undefined);
        setRevealed(false);
        setError("");
    }
    async function draw() {
        if (busy.current) return;
        busy.current = true;
        setPending(true);
        setError("");
        setRevealed(false);
        try {
            const response = await getRandomStart({
                range: custom ? range : undefined,
                previous: result?.start,
                continuationCount,
            });
            if (response.error) {
                setError(t(response.error));
                setResult(undefined);
            } else setResult(response.result);
        } catch {
            setError(t("error"));
        } finally {
            busy.current = false;
            setPending(false);
        }
    }
    return (
        <div className="mt-6 space-y-5">
            <section className="rounded-2xl border border-border bg-card/70 p-4 sm:p-6">
                <div className="flex flex-wrap gap-2">
                    <Button
                        variant={!custom ? "default" : "outline"}
                        aria-pressed={!custom}
                        disabled={pending}
                        onClick={() => {
                            setCustom(false);
                            setResult(undefined);
                            setError("");
                        }}
                    >
                        {t("memorized")}
                    </Button>
                    <Button
                        variant={custom ? "default" : "outline"}
                        aria-pressed={custom}
                        disabled={pending}
                        onClick={() => {
                            setCustom(true);
                            setResult(undefined);
                            setError("");
                        }}
                    >
                        {t("custom")}
                    </Button>
                </div>
                <p className="my-4 text-sm leading-6 text-muted-foreground">
                    {custom
                        ? t("customHint")
                        : t("marked", { count: completedCount })}
                </p>
                {custom && (
                    <fieldset disabled={pending} className="mb-5">
                        <QuranRangeSelector
                            surahs={surahs}
                            navigation={navigation}
                            locale={locale}
                            start={range.start}
                            end={range.end}
                            onChange={(value) => {
                                setRange(value);
                                setResult(undefined);
                                setError("");
                            }}
                        />
                    </fieldset>
                )}
                <fieldset disabled={pending} className="mb-5 min-w-0 max-w-sm">
                    <legend className="text-sm font-medium">
                        {t("continuationCount")}
                    </legend>
                    <div
                        dir="ltr"
                        className="mt-3 flex items-center gap-3 rounded-2xl border border-border/60 bg-background/60 p-2"
                    >
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="size-11 shrink-0 rounded-xl"
                            disabled={pending || continuationCount <= 1}
                            aria-label={t("decreaseCount")}
                            onClick={() => changeCount(continuationCount - 1)}
                        >
                            <Minus className="size-4" />
                        </Button>
                        <output
                            className="min-w-0 flex-1 text-center text-2xl font-semibold tabular-nums text-primary"
                            aria-live="polite"
                            aria-label={t("continuationCount")}
                        >
                            {continuationCount}
                        </output>
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="size-11 shrink-0 rounded-xl"
                            disabled={pending || continuationCount >= 30}
                            aria-label={t("increaseCount")}
                            onClick={() => changeCount(continuationCount + 1)}
                        >
                            <Plus className="size-4" />
                        </Button>
                    </div>
                    <div dir="ltr" className="mt-2 grid grid-cols-5 gap-2">
                        {[1, 5, 10, 20, 30].map((count) => (
                            <Button
                                key={count}
                                type="button"
                                variant={
                                    continuationCount === count
                                        ? "secondary"
                                        : "ghost"
                                }
                                className="min-h-11 min-w-0 rounded-xl px-1 tabular-nums"
                                aria-pressed={continuationCount === count}
                                onClick={() => changeCount(count)}
                            >
                                {count}
                            </Button>
                        ))}
                    </div>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">
                        {t("continuationHint")}
                    </p>
                </fieldset>
                {!custom && completedCount === 0 && (
                    <p className="mb-4 text-sm text-muted-foreground">
                        {t("empty")}
                    </p>
                )}
                <Button
                    disabled={pending || (!custom && completedCount === 0)}
                    onClick={draw}
                    className="min-h-11 w-full sm:w-auto"
                >
                    {pending ? (
                        <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                        <Shuffle className="size-4" />
                    )}
                    {t(result ? "another" : "start")}
                </Button>
                {error && (
                    <p role="alert" className="mt-3 text-sm text-destructive">
                        {error}
                    </p>
                )}
            </section>
            {result && (
                <section
                    aria-busy={pending}
                    className="overflow-hidden rounded-3xl border border-primary/20 bg-card/80 shadow-sm"
                >
                    <div
                        className="border-b border-primary/10 bg-primary/[0.04] p-4 sm:px-6 sm:py-5"
                        aria-live="polite"
                    >
                        <h2 className="font-semibold text-primary">
                            {result.name} ·{" "}
                            {t("ayah", { number: result.start.ayahNumber })}
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {t("recite")}
                        </p>
                    </div>
                    <div
                        dir="rtl"
                        lang="ar"
                        className="mx-auto max-w-4xl px-5 py-7 text-center text-2xl leading-[2.25] sm:px-10 sm:py-10 sm:text-3xl"
                        style={{
                            fontFamily:
                                result.riwayah === "warsh"
                                    ? '"Uthmanic Warsh", Amiri, serif'
                                    : "Amiri, serif",
                        }}
                    >
                        <p>
                            {(revealed
                                ? result.verses
                                : result.verses.slice(0, 1)
                            ).map((verse, index) => (
                                <span
                                    key={`${verse.surahNumber}:${verse.number}`}
                                >
                                    {index > 0 &&
                                        verse.surahNumber !==
                                            result.verses[index - 1]
                                                .surahNumber && (
                                            <span className="my-6 block text-center">
                                                <span
                                                    aria-hidden="true"
                                                    className="surah-name block text-4xl font-normal leading-none tracking-normal text-primary sm:text-5xl"
                                                >
                                                    {getArabicNumber(
                                                        verse.surahNumber,
                                                    )}
                                                </span>
                                                <span className="sr-only">
                                                    {verse.surahName}
                                                </span>
                                            </span>
                                        )}
                                    {verse.text}
                                    {"\u00a0"}
                                    <span
                                        role="img"
                                        className="frame inline-block whitespace-nowrap px-[0.12em] text-primary"
                                        aria-label={t("ayah", {
                                            number: verse.number,
                                        })}
                                    >
                                        {getArabicNumber(verse.number)}
                                    </span>{" "}
                                </span>
                            ))}
                        </p>
                    </div>
                    <div className="flex flex-col gap-3 border-t border-primary/10 bg-primary/[0.025] p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                        <p className="text-xs leading-5 text-muted-foreground">
                            <span className="mb-1 block font-medium text-foreground">
                                {t("actualCount", {
                                    count: result.verses.length - 1,
                                    requested: result.requestedCount,
                                })}
                            </span>
                            {result.verses.length - 1 <
                                result.requestedCount && (
                                <span className="mb-1 block">
                                    {t("rangeEnd")}
                                </span>
                            )}
                            {t(result.verses.length > 1 ? "checkHint" : "end")}
                        </p>
                        {result.verses.length > 1 && (
                            <Button
                                variant="outline"
                                className="min-h-11 shrink-0 rounded-xl bg-background/60"
                                disabled={pending}
                                onClick={() => setRevealed((value) => !value)}
                            >
                                <Eye className="size-4" />
                                {t(revealed ? "hide" : "reveal")}
                            </Button>
                        )}
                    </div>
                </section>
            )}
        </div>
    );
}
