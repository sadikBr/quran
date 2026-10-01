"use client";

import {
    Eye,
    LoaderCircle,
    Minus,
    Plus,
    Settings2,
    Shuffle,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import SectionHeading from "@/components/section-heading";
import { Button } from "@/components/ui/button";
import QuranRangeSelector, {
    SurahCombobox,
    type SurahOption,
} from "@/features/practice/components/quran-range-selector";
import type { QuranReference } from "@/features/practice/types";
import type { QuranNavigationMeta } from "@/features/quran/navigation-types";
import { getArabicNumber } from "@/lib/arabic-numbers";
import getRandomStart from "../server/get-random-start";

type DifficultStart = {
    mode?: "random" | "opening" | "ending";
    count?: number;
    start: QuranReference;
    end: QuranReference;
    name: string;
};
const referenceKey = (point: QuranReference) =>
    `${point.surahNumber}:${point.ayahNumber}`;
const difficultKey = (item: { start: QuranReference; mode?: string }) =>
    `${item.mode ?? "random"}:${referenceKey(item.start)}`;

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
    const [settingsOpen, setSettingsOpen] = useState(true);
    const [mode, setMode] = useState<"random" | "opening" | "ending">("random");
    const [selectedSurah, setSelectedSurah] = useState(1);
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
            if (["random", "opening", "ending"].includes(saved?.mode))
                setMode(saved.mode);
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
                                typeof item.name === "string" &&
                                (item.mode === undefined ||
                                    ["random", "opening", "ending"].includes(
                                        item.mode,
                                    )),
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
                    mode,
                }),
            );
        } catch {
            setStorageError(true);
        }
    }, [storageKey, ready, continuationCount, difficult, spanSurahs, mode]);
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
        setResult(undefined);
        setVisibleCount(1);
        try {
            const response = await getRandomStart({
                mode: retry?.mode ?? (retry ? "random" : mode),
                selectedSurah:
                    retry?.mode && retry.mode !== "random"
                        ? retry.start.surahNumber
                        : !retry && mode !== "random" && custom
                          ? selectedSurah
                          : undefined,
                range: retry
                    ? { start: retry.start, end: retry.end }
                    : custom
                      ? range
                      : undefined,
                seen: restart ? [] : seen,
                retry: retry?.start,
                continuationCount: retry?.count ?? continuationCount,
                spanSurahs,
            });
            if (response.error) {
                setSettingsOpen(true);
                setError(t(response.error));
                setResult(undefined);
            } else {
                setResult(response.result);
                setSettingsOpen(false);
                setVisibleCount(response.result.mode === "random" ? 1 : 0);
                if (!retry)
                    setSeen((current) => [
                        ...(restart ? [] : current),
                        response.result.start,
                    ]);
            }
        } catch {
            setSettingsOpen(true);
            setError(t("error"));
        } finally {
            busy.current = false;
            setPending(false);
        }
    }
    return (
        <div className="mt-6 space-y-5">
            <section data-tour="test-settings" className="app-card p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <SectionHeading
                        title={t("testSettings")}
                        icon={<Settings2 />}
                        description={
                            !settingsOpen
                                ? `${t(`modes.${mode}`)} · ${t("settingsCount", { count: continuationCount })}`
                                : undefined
                        }
                    />
                    <Button
                        type="button"
                        variant="ghost"
                        className="min-h-11 rounded-xl"
                        aria-expanded={settingsOpen}
                        aria-controls="test-settings-panel"
                        onClick={() => setSettingsOpen((value) => !value)}
                    >
                        {t(settingsOpen ? "collapseSettings" : "editSettings")}
                    </Button>
                </div>
                <div
                    id="test-settings-panel"
                    hidden={!settingsOpen}
                    className="mt-4"
                >
                    <div className="mb-5 grid grid-cols-3 gap-2 rounded-2xl bg-muted/40 p-1.5">
                        {(["random", "opening", "ending"] as const).map(
                            (value) => (
                                <Button
                                    key={value}
                                    variant={
                                        mode === value ? "default" : "ghost"
                                    }
                                    disabled={pending}
                                    className="min-h-11 whitespace-normal px-2"
                                    aria-pressed={mode === value}
                                    onClick={() => {
                                        setMode(value);
                                        setResult(undefined);
                                        setSeen([]);
                                        setError("");
                                    }}
                                >
                                    {t(`modes.${value}`)}
                                </Button>
                            ),
                        )}
                    </div>
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
                            {t(mode === "random" ? "custom" : "chooseSurah")}
                        </Button>
                    </div>
                    <p className="my-4 text-sm leading-6 text-muted-foreground">
                        {mode !== "random"
                            ? t("edgeHint")
                            : custom
                              ? t("customHint")
                              : t("marked", { count: completedCount })}
                    </p>
                    {custom && mode !== "random" && (
                        <div className="mb-5 max-w-lg">
                            <SurahCombobox
                                options={surahs}
                                value={selectedSurah}
                                locale={locale}
                                onValueChange={(value) => {
                                    if (pending) return;
                                    setSelectedSurah(value);
                                    setResult(undefined);
                                    setError("");
                                }}
                            />
                        </div>
                    )}
                    {custom && mode === "random" && (
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
                            <legend
                                data-tour="test-count"
                                className="text-sm font-medium"
                            >
                                {t(
                                    mode === "random"
                                        ? "continuationCount"
                                        : "edgeCount",
                                )}
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
                                    disabled={
                                        pending || continuationCount >= 30
                                    }
                                    aria-label={t("increaseCount")}
                                    onClick={() =>
                                        changeCount(continuationCount + 1)
                                    }
                                >
                                    <Plus className="size-4" />
                                </Button>
                            </div>
                            <div
                                dir="ltr"
                                className="mt-2 grid grid-cols-5 gap-2"
                            >
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
                                        aria-pressed={
                                            continuationCount === count
                                        }
                                        onClick={() => changeCount(count)}
                                    >
                                        {count}
                                    </Button>
                                ))}
                            </div>
                            <p className="mt-2 text-xs leading-5 text-muted-foreground">
                                {t(
                                    mode === "random"
                                        ? "continuationHint"
                                        : "edgeCountHint",
                                )}
                            </p>
                        </fieldset>
                        {mode === "random" && (
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
                                    onClick={() =>
                                        setSpanSurahs((value) => !value)
                                    }
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
                        )}
                    </div>
                    {!custom && completedCount === 0 && (
                        <p className="mb-4 text-sm text-muted-foreground">
                            {t("empty")}
                        </p>
                    )}
                </div>
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
                        data-tour="test-start"
                        onClick={() => draw()}
                        className="min-h-12 w-full shrink-0 rounded-xl px-6 sm:w-auto"
                    >
                        {pending ? (
                            <LoaderCircle className="size-4 animate-spin" />
                        ) : (
                            <Shuffle className="size-4" />
                        )}
                        {t(
                            mode === "random"
                                ? result
                                    ? "another"
                                    : "start"
                                : mode === "opening"
                                  ? result
                                      ? "anotherOpening"
                                      : "startOpening"
                                  : result
                                    ? "anotherEnding"
                                    : "startEnding",
                        )}
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
                <details className="app-card p-4">
                    <summary className="cursor-pointer text-sm font-semibold text-primary">
                        {t("difficultList", { count: difficult.length })}
                    </summary>
                    <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
                        {difficult.map((item) => (
                            <div
                                key={difficultKey(item)}
                                className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-background/60 p-3"
                            >
                                <span className="text-sm">
                                    <span className="mb-1 block w-fit rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                                        {t(`modes.${item.mode ?? "random"}`)}
                                    </span>
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
                                                        difficultKey(entry) !==
                                                        difficultKey(item),
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
                    className="app-card overflow-hidden"
                >
                    <div
                        className="border-b border-border/50 bg-muted/20 p-4 sm:p-5"
                        aria-live="polite"
                    >
                        <h2 className="font-semibold text-primary">
                            {result.name} ·{" "}
                            {result.mode === "random"
                                ? t("ayah", { number: result.start.ayahNumber })
                                : t(`modes.${result.mode}`)}
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {t(
                                result.mode === "random"
                                    ? "recite"
                                    : result.mode === "opening"
                                      ? "reciteOpening"
                                      : "reciteEnding",
                            )}
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
                        {visibleCount === 0 && (
                            <div className="py-5">
                                <span
                                    aria-hidden="true"
                                    className="surah-name block text-5xl leading-none text-primary"
                                >
                                    {getArabicNumber(result.start.surahNumber)}
                                </span>
                                <p className="mt-5 font-sans text-sm leading-6 text-muted-foreground">
                                    {t("hiddenPrompt")}
                                </p>
                            </div>
                        )}
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
                    <div className="flex flex-col gap-3 border-t border-border/50 bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                        <p className="text-xs leading-5 text-muted-foreground">
                            <span className="mb-1 block font-medium text-foreground">
                                {t(
                                    result.mode === "random"
                                        ? "actualCount"
                                        : "edgeActualCount",
                                    {
                                        count:
                                            result.verses.length -
                                            (result.mode === "random" ? 1 : 0),
                                        requested: result.requestedCount,
                                    },
                                )}
                            </span>
                            {result.verses.length -
                                (result.mode === "random" ? 1 : 0) <
                                result.requestedCount && (
                                <span className="mb-1 block">
                                    {t("rangeEnd")}
                                </span>
                            )}
                            {t(
                                result.mode !== "random" ||
                                    result.verses.length > 1
                                    ? "checkHint"
                                    : "end",
                            )}
                        </p>
                        {(result.mode !== "random" ||
                            result.verses.length > 1) && (
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
                                                ? result.mode === "random"
                                                    ? 1
                                                    : 0
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
                                        difficultKey(item) ===
                                        difficultKey(result),
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
                                        mode: result.mode,
                                        count: result.requestedCount,
                                    },
                                ]);
                            }}
                        >
                            {t(
                                difficult.some(
                                    (item) =>
                                        difficultKey(item) ===
                                        difficultKey(result),
                                )
                                    ? "savedDifficult"
                                    : "needsRevision",
                            )}
                        </Button>
                        {difficult.some(
                            (item) =>
                                difficultKey(item) === difficultKey(result),
                        ) && (
                            <Button
                                variant="ghost"
                                disabled={pending}
                                onClick={() =>
                                    setDifficult((items) =>
                                        items.filter(
                                            (item) =>
                                                difficultKey(item) !==
                                                difficultKey(result),
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
