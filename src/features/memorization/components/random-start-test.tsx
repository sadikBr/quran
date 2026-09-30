"use client";

import { Eye, LoaderCircle, Minus, Plus, Shuffle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import QuranRangeSelector, {
    type SurahOption,
} from "@/features/practice/components/quran-range-selector";
import type { QuranReference } from "@/features/practice/types";
import type { QuranNavigationMeta } from "@/features/quran/navigation-types";
import { getArabicNumber } from "@/lib/arabic-numbers";
import getRandomStart from "../server/get-random-start";

type DifficultStart = {
    start: QuranReference;
    end: QuranReference;
    name: string;
};
const referenceKey = (point: QuranReference) =>
    `${point.surahNumber}:${point.ayahNumber}`;

export default function RandomStartTest({
    surahs,
    navigation,
    locale,
    completedCount,
    storageKey,
}: {
    surahs: SurahOption[];
    navigation: QuranNavigationMeta;
    locale: string;
    completedCount: number;
    storageKey: string;
}) {
    const t = useTranslations("Memorization.test");
    const [custom, setCustom] = useState(false);
    const [continuationCount, setContinuationCount] = useState(5);
    const [spanSurahs, setSpanSurahs] = useState(true);
    const [range, setRange] = useState({
        start: { surahNumber: 1, ayahNumber: 1 },
        end: { surahNumber: 1, ayahNumber: 7 },
    });
    const [result, setResult] =
        useState<Awaited<ReturnType<typeof getRandomStart>>["result"]>();
    const [visibleCount, setVisibleCount] = useState(1);
    const [difficult, setDifficult] = useState<DifficultStart[]>([]);
    const [seen, setSeen] = useState<QuranReference[]>([]);
    const [ready, setReady] = useState(false);
    const [storageError, setStorageError] = useState(false);
    useEffect(() => {
        try {
            const saved = JSON.parse(
                localStorage.getItem(storageKey) ?? "null",
            );
            if (typeof saved?.spanSurahs === "boolean")
                setSpanSurahs(saved.spanSurahs);
            if (
                Number.isInteger(saved?.count) &&
                saved.count >= 1 &&
                saved.count <= 30
            )
                setContinuationCount(saved.count);
            const valid = (point: QuranReference) =>
                point &&
                Number.isInteger(point.surahNumber) &&
                point.surahNumber >= 1 &&
                point.surahNumber <= 114 &&
                Number.isInteger(point.ayahNumber) &&
                point.ayahNumber >= 1 &&
                point.ayahNumber <= 286;
            if (Array.isArray(saved?.difficult))
                setDifficult(
                    saved.difficult
                        .filter(
                            (item: DifficultStart) =>
                                item &&
                                valid(item.start) &&
                                valid(item.end) &&
                                typeof item.name === "string",
                        )
                        .slice(0, 7000),
                );
        } catch {
            setStorageError(true);
        }
        setReady(true);
    }, [storageKey]);
    useEffect(() => {
        if (!ready) return;
        try {
            localStorage.setItem(
                storageKey,
                JSON.stringify({
                    count: continuationCount,
                    difficult,
                    spanSurahs,
                }),
            );
        } catch {
            setStorageError(true);
        }
    }, [storageKey, ready, continuationCount, difficult, spanSurahs]);
    const [pending, setPending] = useState(false);
    const [error, setError] = useState("");
    const busy = useRef(false);
    function changeCount(value: number) {
        setContinuationCount(Math.max(1, Math.min(30, value)));
        setResult(undefined);
        setVisibleCount(1);
        setError("");
    }
    async function draw(retry?: DifficultStart, restart = false) {
        if (busy.current) return;
        busy.current = true;
        setPending(true);
        setError("");
        setVisibleCount(1);
        try {
            const response = await getRandomStart({
                range: retry
                    ? { start: retry.start, end: retry.end }
                    : custom
                      ? range
                      : undefined,
                seen: restart ? [] : seen,
                retry: retry?.start,
                continuationCount,
                spanSurahs,
            });
            if (response.error) {
                setError(t(response.error));
                setResult(undefined);
            } else {
                setResult(response.result);
                if (!retry)
                    setSeen((current) => [
                        ...(restart ? [] : current),
                        response.result.start,
                    ]);
            }
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
                <div className="grid gap-5 border-t border-border/50 pt-5 md:grid-cols-2 md:gap-8">
                    <fieldset disabled={pending} className="min-w-0">
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
                                onClick={() =>
                                    changeCount(continuationCount - 1)
                                }
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
                                onClick={() =>
                                    changeCount(continuationCount + 1)
                                }
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
                    <div className="flex items-center justify-between gap-4 self-start rounded-2xl border border-border/60 bg-background/40 p-4 sm:p-5 md:mt-6">
                        <div>
                            <label
                                htmlFor="span-surahs"
                                className="cursor-pointer text-sm font-medium"
                            >
                                {t("spanSurahs")}
                            </label>
                            <p
                                id="span-surahs-hint"
                                className="mt-1 text-xs leading-5 text-muted-foreground"
                            >
                                {t("spanSurahsHint")}
                            </p>
                        </div>
                        <button
                            id="span-surahs"
                            type="button"
                            role="switch"
                            aria-checked={spanSurahs}
                            aria-describedby="span-surahs-hint"
                            disabled={!ready || pending}
                            onClick={() => setSpanSurahs((value) => !value)}
                            className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                        >
                            <span
                                dir="ltr"
                                className={`flex h-6 w-11 items-center rounded-full p-0.5 transition-colors ${spanSurahs ? "bg-primary" : "bg-muted-foreground/30"}`}
                            >
                                <span
                                    className={`size-5 rounded-full bg-background shadow-sm transition-transform ${spanSurahs ? "translate-x-5" : "translate-x-0"}`}
                                />
                            </span>
                        </button>
                    </div>
                </div>
                {!custom && completedCount === 0 && (
                    <p className="mb-4 text-sm text-muted-foreground">
                        {t("empty")}
                    </p>
                )}
                <div className="mt-5 flex flex-col gap-4 border-t border-border/50 pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 space-y-1">
                        <p className="text-sm font-medium">
                            {t("sessionCount", { count: seen.length })}
                        </p>
                        <p className="text-xs leading-5 text-muted-foreground">
                            {t(storageError ? "storageError" : "localSave")}
                        </p>
                    </div>
                    <Button
                        disabled={
                            !ready ||
                            pending ||
                            (!custom && completedCount === 0)
                        }
                        onClick={() => draw()}
                        className="min-h-12 w-full shrink-0 rounded-xl px-6 sm:w-auto"
                    >
                        {pending ? (
                            <LoaderCircle className="size-4 animate-spin" />
                        ) : (
                            <Shuffle className="size-4" />
                        )}
                        {t(result ? "another" : "start")}
                    </Button>
                </div>
                {error && (
                    <p role="alert" className="mt-3 text-sm text-destructive">
                        {error}
                    </p>
                )}
                {error === t("exhausted") && (
                    <Button
                        className="mt-3"
                        variant="outline"
                        disabled={pending}
                        onClick={() => draw(undefined, true)}
                    >
                        {t("restartSession")}
                    </Button>
                )}
            </section>
            {difficult.length > 0 && (
                <details className="rounded-2xl border border-border bg-card/60 p-4">
                    <summary className="cursor-pointer text-sm font-semibold text-primary">
                        {t("difficultList", { count: difficult.length })}
                    </summary>
                    <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
                        {difficult.map((item) => (
                            <div
                                key={referenceKey(item.start)}
                                className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-background/60 p-3"
                            >
                                <span className="text-sm">
                                    {item.name} ·{" "}
                                    {t("ayah", {
                                        number: item.start.ayahNumber,
                                    })}
                                </span>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        disabled={pending}
                                        onClick={() => draw(item)}
                                    >
                                        {t("retry")}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        disabled={pending}
                                        onClick={() =>
                                            setDifficult((items) =>
                                                items.filter(
                                                    (entry) =>
                                                        referenceKey(
                                                            entry.start,
                                                        ) !==
                                                        referenceKey(
                                                            item.start,
                                                        ),
                                                ),
                                            )
                                        }
                                    >
                                        {t("mastered")}
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </details>
            )}
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
                            {result.verses
                                .slice(0, visibleCount)
                                .map((verse, index) => (
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
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    variant="outline"
                                    className="min-h-11 rounded-xl"
                                    disabled={
                                        pending ||
                                        visibleCount >= result.verses.length
                                    }
                                    onClick={() =>
                                        setVisibleCount((value) =>
                                            Math.min(
                                                value + 1,
                                                result.verses.length,
                                            ),
                                        )
                                    }
                                >
                                    {t("hint")}
                                </Button>
                                <Button
                                    variant="outline"
                                    className="min-h-11 shrink-0 rounded-xl bg-background/60"
                                    disabled={pending}
                                    onClick={() =>
                                        setVisibleCount(
                                            visibleCount ===
                                                result.verses.length
                                                ? 1
                                                : result.verses.length,
                                        )
                                    }
                                >
                                    <Eye className="size-4" />
                                    {t(
                                        visibleCount === result.verses.length
                                            ? "hide"
                                            : "reveal",
                                    )}
                                </Button>
                            </div>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-2 border-t border-border/50 p-4 sm:px-6">
                        <Button
                            variant="outline"
                            disabled={
                                !ready ||
                                pending ||
                                difficult.some(
                                    (item) =>
                                        referenceKey(item.start) ===
                                        referenceKey(result.start),
                                )
                            }
                            onClick={() => {
                                const last =
                                    result.verses[result.verses.length - 1];
                                setDifficult((items) => [
                                    ...items,
                                    {
                                        start: result.start,
                                        end: {
                                            surahNumber: last.surahNumber,
                                            ayahNumber: last.number,
                                        },
                                        name: result.name,
                                    },
                                ]);
                            }}
                        >
                            {t(
                                difficult.some(
                                    (item) =>
                                        referenceKey(item.start) ===
                                        referenceKey(result.start),
                                )
                                    ? "savedDifficult"
                                    : "needsRevision",
                            )}
                        </Button>
                        {difficult.some(
                            (item) =>
                                referenceKey(item.start) ===
                                referenceKey(result.start),
                        ) && (
                            <Button
                                variant="ghost"
                                disabled={pending}
                                onClick={() =>
                                    setDifficult((items) =>
                                        items.filter(
                                            (item) =>
                                                referenceKey(item.start) !==
                                                referenceKey(result.start),
                                        ),
                                    )
                                }
                            >
                                {t("mastered")}
                            </Button>
                        )}
                    </div>
                </section>
            )}
        </div>
    );
}
