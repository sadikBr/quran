"use client";

import {
    ArrowLeft,
    ArrowRight,
    BookOpenText,
    LoaderCircle,
    RotateCcw,
    Search,
    SearchX,
    X,
} from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSettings } from "@/features/settings/settings-provider";
import type {
    QuranSearchResponse,
    QuranSearchResult,
    QuranSearchSnippet,
} from "../search-types";

type SearchStatus = "idle" | "loading" | "success" | "error";

function HighlightedSnippet({
    snippet,
    className,
}: {
    snippet: QuranSearchSnippet;
    className?: string;
}) {
    return (
        <p className={className}>
            {snippet.leadingEllipsis && "…"}
            {snippet.before}
            {snippet.before && snippet.match && " "}
            {snippet.match && (
                <mark className="rounded-sm bg-primary/15 px-0.5 text-inherit ring-1 ring-primary/20">
                    {snippet.match}
                </mark>
            )}
            {snippet.match && snippet.after && " "}
            {snippet.after}
            {snippet.trailingEllipsis && "…"}
        </p>
    );
}

function SearchResultRow({
    result,
    href,
}: {
    result: QuranSearchResult;
    href: string;
}) {
    const t = useTranslations("Reader.search");
    const locale = useLocale();
    const surahName =
        locale === "ar" ? result.surahArabicName : result.surahEnglishName;
    const DirectionArrow = locale === "ar" ? ArrowLeft : ArrowRight;

    return (
        <Link
            href={href}
            aria-label={t("openResult", {
                surah: surahName,
                ayah: result.ayahNumber,
            })}
            className="group block py-5 outline-none transition-colors hover:bg-muted/30 focus-visible:bg-muted/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-2"
        >
            <div className="flex min-w-0 items-start gap-4">
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {result.ayahNumber.toLocaleString(locale)}
                </span>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">
                            {surahName}
                        </span>
                        <span>{t("page", { number: result.pageNumber })}</span>
                        <span className="text-primary/80">
                            {t(
                                result.field === "arabic"
                                    ? "arabicMatch"
                                    : "translationMatch",
                            )}
                        </span>
                    </div>
                    {result.field === "arabic" ? (
                        <HighlightedSnippet
                            snippet={result.snippet}
                            className="ayah mt-3 text-end text-2xl leading-[2.15] text-foreground sm:text-[1.7rem]"
                        />
                    ) : (
                        <>
                            <HighlightedSnippet
                                snippet={result.snippet}
                                className="mt-3 text-sm leading-7 text-foreground sm:text-base"
                            />
                            <p
                                dir="rtl"
                                className="ayah mt-3 line-clamp-2 text-end text-lg leading-9 text-muted-foreground"
                            >
                                {result.arabicText}
                            </p>
                        </>
                    )}
                </div>
                <DirectionArrow
                    aria-hidden="true"
                    className="mt-2 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary rtl:group-hover:-translate-x-0.5"
                />
            </div>
        </Link>
    );
}

export default function QuranSearch({
    initialQuery = "",
}: {
    initialQuery?: string;
}) {
    const t = useTranslations("Reader.search");
    const locale = useLocale();
    const preferences = useSettings();
    const [query, setQuery] = useState(initialQuery);
    const [status, setStatus] = useState<SearchStatus>(
        initialQuery.trim().length >= 2 ? "loading" : "idle",
    );
    const [response, setResponse] = useState<QuranSearchResponse>();
    const [retryKey, setRetryKey] = useState(0);
    const trimmedQuery = query.trim();

    useEffect(() => {
        const url = new URL(window.location.href);
        if (trimmedQuery) url.searchParams.set("q", trimmedQuery);
        else url.searchParams.delete("q");
        window.history.replaceState({}, "", url);

        if (trimmedQuery.length < 2) {
            setStatus("idle");
            setResponse(undefined);
            return;
        }

        const controller = new AbortController();
        const timeout = window.setTimeout(async () => {
            setStatus("loading");

            try {
                const result = await fetch(
                    `/api/quran/search?q=${encodeURIComponent(trimmedQuery)}&retry=${retryKey}`,
                    { cache: "no-store", signal: controller.signal },
                );
                if (!result.ok) throw new Error("Search request failed");

                const data = (await result.json()) as QuranSearchResponse;
                if (!controller.signal.aborted) {
                    setResponse(data);
                    setStatus("success");
                }
            } catch (error) {
                if (
                    !controller.signal.aborted &&
                    !(
                        error instanceof DOMException &&
                        error.name === "AbortError"
                    )
                ) {
                    setStatus("error");
                }
            }
        }, 300);

        return () => {
            window.clearTimeout(timeout);
            controller.abort();
        };
    }, [trimmedQuery, retryKey]);

    const groupedResults = useMemo(() => {
        const groups = new Map<number, QuranSearchResult[]>();
        for (const result of response?.results ?? []) {
            const group = groups.get(result.surahNumber) ?? [];
            group.push(result);
            groups.set(result.surahNumber, group);
        }
        return [...groups.entries()];
    }, [response]);

    function resultHref(result: QuranSearchResult) {
        const location =
            preferences.readingMode === "page"
                ? result.pageNumber
                : result.surahNumber;
        return `/quran/${preferences.readingMode}/${location}#ayah-${result.globalAyahNumber}`;
    }

    return (
        <div className="h-full overflow-y-auto">
            <div className="mx-auto w-full max-w-4xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
                <Link
                    href="/quran"
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    {locale === "ar" ? (
                        <ArrowRight aria-hidden="true" className="size-4" />
                    ) : (
                        <ArrowLeft aria-hidden="true" className="size-4" />
                    )}
                    {t("backToSurahs")}
                </Link>

                <header className="mt-8 max-w-2xl">
                    <p className="text-xs font-semibold tracking-[0.22em] text-primary">
                        {t("eyebrow")}
                    </p>
                    <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">
                        {t("title")}
                    </h1>
                    <p className="mt-4 text-sm leading-7 text-muted-foreground sm:text-base">
                        {t("description")}
                    </p>
                </header>

                <div className="relative mt-8 sm:mt-10">
                    <Label htmlFor="quran-search" className="sr-only">
                        {t("label")}
                    </Label>
                    <Search
                        aria-hidden="true"
                        className="pointer-events-none absolute top-1/2 start-4 size-5 -translate-y-1/2 text-primary"
                    />
                    <Input
                        id="quran-search"
                        type="search"
                        inputMode="search"
                        autoComplete="off"
                        autoFocus
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder={t("placeholder")}
                        className="h-14 rounded-xl border-0 bg-muted/65 px-12 text-base shadow-none placeholder:text-muted-foreground/70 focus-visible:bg-muted/85 focus-visible:ring-1 sm:h-16 sm:text-lg [&::-webkit-search-cancel-button]:appearance-none"
                    />
                    {query && (
                        <button
                            type="button"
                            onClick={() => setQuery("")}
                            aria-label={t("clear")}
                            className="absolute top-1/2 end-3 flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <X aria-hidden="true" className="size-4" />
                        </button>
                    )}
                </div>

                <section
                    aria-live="polite"
                    aria-busy={status === "loading"}
                    className="mt-9"
                >
                    {status === "idle" && (
                        <div className="flex min-h-64 flex-col items-center justify-center text-center">
                            <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                                <BookOpenText
                                    aria-hidden="true"
                                    className="size-5"
                                />
                            </span>
                            <h2 className="mt-5 text-lg font-semibold">
                                {t("promptTitle")}
                            </h2>
                            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                                {t("promptDescription")}
                            </p>
                        </div>
                    )}

                    {status === "loading" && (
                        <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-muted-foreground">
                            <LoaderCircle
                                aria-hidden="true"
                                className="size-5 animate-spin text-primary"
                            />
                            {t("loading")}
                        </div>
                    )}

                    {status === "error" && (
                        <div className="flex min-h-64 flex-col items-center justify-center text-center">
                            <SearchX
                                aria-hidden="true"
                                className="size-9 text-primary"
                            />
                            <h2 className="mt-5 text-lg font-semibold">
                                {t("errorTitle")}
                            </h2>
                            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                                {t("errorDescription")}
                            </p>
                            <Button
                                type="button"
                                variant="ghost"
                                className="mt-4 gap-2 text-primary"
                                onClick={() =>
                                    setRetryKey((value) => value + 1)
                                }
                            >
                                <RotateCcw
                                    aria-hidden="true"
                                    className="size-4"
                                />
                                {t("retry")}
                            </Button>
                        </div>
                    )}

                    {status === "success" && response?.total === 0 && (
                        <div className="flex min-h-64 flex-col items-center justify-center text-center">
                            <SearchX
                                aria-hidden="true"
                                className="size-9 text-primary"
                            />
                            <h2 className="mt-5 text-lg font-semibold">
                                {t("noResultsTitle")}
                            </h2>
                            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                                {t("noResultsDescription")}
                            </p>
                        </div>
                    )}

                    {status === "success" && response && response.total > 0 && (
                        <>
                            <div className="flex flex-col gap-2 border-b border-border/60 pb-4 text-sm sm:flex-row sm:items-end sm:justify-between">
                                <div>
                                    <p className="font-semibold text-foreground">
                                        {t("results", {
                                            count: response.total,
                                        })}
                                    </p>
                                    {response.truncated && (
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {t("limited", {
                                                count: response.results.length,
                                            })}
                                        </p>
                                    )}
                                </div>
                                <p className="text-xs leading-5 text-muted-foreground">
                                    {t("usingEditions", {
                                        arabic: response.editions.arabic.name,
                                        translation:
                                            response.editions.translation.name,
                                    })}
                                </p>
                            </div>

                            <div>
                                {groupedResults.map(
                                    ([surahNumber, results]) => (
                                        <section
                                            key={surahNumber}
                                            aria-labelledby={`search-surah-${surahNumber}`}
                                            className="border-b border-border/60 last:border-b-0"
                                        >
                                            <h2
                                                id={`search-surah-${surahNumber}`}
                                                className="pt-7 text-xs font-semibold tracking-[0.18em] text-primary"
                                            >
                                                {locale === "ar"
                                                    ? results[0].surahArabicName
                                                    : results[0]
                                                          .surahEnglishName}
                                            </h2>
                                            <div className="divide-y divide-border/45">
                                                {results.map((result) => (
                                                    <SearchResultRow
                                                        key={`${result.field}-${result.globalAyahNumber}-${result.ayahNumber}`}
                                                        result={result}
                                                        href={resultHref(
                                                            result,
                                                        )}
                                                    />
                                                ))}
                                            </div>
                                        </section>
                                    ),
                                )}
                            </div>
                        </>
                    )}
                </section>
            </div>
        </div>
    );
}
