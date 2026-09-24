"use client";

import {
    ArrowRight,
    Bookmark,
    BookOpen,
    ChevronLeft,
    ChevronRight,
    Ellipsis,
    NotebookPen,
    Search,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Combobox,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
} from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import type { ReadingMode } from "@/features/settings/preferences";
import type { SavedAyah } from "../types";
import SavedAyahActions from "./saved-ayah-actions";

const AYAH_ITEMS_PER_PAGE = 5;

function normalizeSearch(value: string) {
    return value
        .normalize("NFKD")
        .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
        .replace(/ـ/g, "")
        .replace(/[أإآٱ]/g, "ا")
        .replace(/ى/g, "ي")
        .toLocaleLowerCase();
}

export default function SavedAyahsSection({
    savedAyahs,
    readingMode,
}: {
    savedAyahs: SavedAyah[];
    readingMode: ReadingMode;
}) {
    const [query, setQuery] = useState("");
    const [surahFilter, setSurahFilter] = useState("all");
    const [requestedPage, setRequestedPage] = useState(1);
    const [activeAyah, setActiveAyah] = useState<SavedAyah | null>(null);
    const surahs = useMemo(
        () =>
            Array.from(
                new Map(
                    savedAyahs.map((ayah) => [
                        ayah.surahNumber,
                        ayah.surahName,
                    ]),
                ),
            )
                .sort(([first], [second]) => first - second)
                .map(([number, name]) => ({ number, name })),
        [savedAyahs],
    );
    const filteredAyahs = useMemo(() => {
        const normalizedQuery = normalizeSearch(query.trim());

        return savedAyahs.filter((ayah) => {
            const matchesSurah =
                surahFilter === "all" ||
                ayah.surahNumber.toString() === surahFilter;
            const searchableText = normalizeSearch(
                `${ayah.surahName} ${ayah.surahNumber} ${ayah.ayahNumber} ${ayah.arabicText} ${ayah.reflection ?? ""}`,
            );

            return (
                matchesSurah &&
                (!normalizedQuery || searchableText.includes(normalizedQuery))
            );
        });
    }, [query, savedAyahs, surahFilter]);
    const pageCount = Math.max(
        1,
        Math.ceil(filteredAyahs.length / AYAH_ITEMS_PER_PAGE),
    );
    const currentPage = Math.min(requestedPage, pageCount);
    const firstVisibleIndex = (currentPage - 1) * AYAH_ITEMS_PER_PAGE;
    const visibleAyahs = filteredAyahs.slice(
        firstVisibleIndex,
        firstVisibleIndex + AYAH_ITEMS_PER_PAGE,
    );

    return (
        <section className="mt-16" aria-labelledby="saved-ayahs-title">
            <div className="flex flex-col gap-5 border-b border-primary/15 pb-6 sm:flex-row sm:items-end sm:justify-between">
                <div className="max-w-xl">
                    <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">
                        Your collection
                    </p>
                    <h2
                        id="saved-ayahs-title"
                        className="mt-2 text-2xl font-semibold tracking-tight"
                    >
                        Saved ayahs
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        Return to bookmarks and private reflections from your
                        reading.
                    </p>
                </div>

                {savedAyahs.length > 0 && (
                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                        <label
                            htmlFor="saved-ayah-search"
                            className="relative block sm:w-56"
                        >
                            <span className="sr-only">Search saved ayahs</span>
                            <Search
                                aria-hidden="true"
                                className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                            />
                            <Input
                                id="saved-ayah-search"
                                value={query}
                                onChange={(event) => {
                                    setQuery(event.target.value);
                                    setRequestedPage(1);
                                }}
                                placeholder="Search saved ayahs…"
                                className="border-0 bg-muted/55 pl-9 shadow-none"
                            />
                        </label>
                        <Combobox
                            items={surahs}
                            value={
                                surahs.find(
                                    (surah) =>
                                        surah.number.toString() === surahFilter,
                                ) ?? null
                            }
                            onValueChange={(surah) => {
                                setSurahFilter(
                                    surah ? surah.number.toString() : "all",
                                );
                                setRequestedPage(1);
                            }}
                            itemToStringLabel={(surah) =>
                                `${surah.number}. ${surah.name}`
                            }
                            itemToStringValue={(surah) =>
                                surah.number.toString()
                            }
                            isItemEqualToValue={(surah, selectedSurah) =>
                                surah.number === selectedSurah.number
                            }
                            autoHighlight
                        >
                            <ComboboxInput
                                aria-label="Filter by surah"
                                placeholder="All surahs"
                                showClear
                                className="w-full border-0 bg-muted/55 shadow-none sm:w-48"
                            />
                            <ComboboxContent className="w-[min(20rem,calc(100vw-2rem))] min-w-0 rounded-xl bg-popover/98 p-1 shadow-xl ring-primary/10 backdrop-blur-md">
                                <ComboboxEmpty>
                                    No matching saved surahs.
                                </ComboboxEmpty>
                                <ComboboxList className="max-h-72 p-1">
                                    {(surah: {
                                        number: number;
                                        name: string;
                                    }) => (
                                        <ComboboxItem
                                            key={surah.number}
                                            value={surah}
                                            className="rounded-lg px-3 py-2.5 pr-9 data-highlighted:bg-primary/8"
                                        >
                                            {surah.number}. {surah.name}
                                        </ComboboxItem>
                                    )}
                                </ComboboxList>
                            </ComboboxContent>
                        </Combobox>
                    </div>
                )}
            </div>

            {savedAyahs.length === 0 ? (
                <div className="flex gap-4 py-9">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <BookOpen aria-hidden="true" className="size-5" />
                    </span>
                    <div>
                        <h3 className="font-semibold">Nothing saved yet</h3>
                        <p className="mt-1 max-w-lg text-sm leading-6 text-muted-foreground">
                            Open an ayah’s actions while reading to bookmark it
                            or write a private reflection.
                        </p>
                    </div>
                </div>
            ) : filteredAyahs.length === 0 ? (
                <p className="py-9 text-sm text-muted-foreground">
                    No saved ayahs match this search.
                </p>
            ) : (
                <div>
                    <div className="divide-y divide-primary/10">
                        {visibleAyahs.map((ayah) => {
                            const locationNumber =
                                readingMode === "page"
                                    ? ayah.pageNumber
                                    : ayah.surahNumber;
                            const href = `/quran/${readingMode}/${locationNumber}#ayah-${ayah.globalAyahNumber}`;

                            return (
                                <article
                                    key={ayah.globalAyahNumber}
                                    className="group px-1 py-6 sm:px-3 sm:py-7"
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div className="flex min-w-0 items-center gap-2.5">
                                            <span className="truncate text-sm font-semibold text-primary">
                                                {ayah.surahName}
                                            </span>
                                            <span
                                                aria-hidden="true"
                                                className="size-1 rounded-full bg-primary/30"
                                            />
                                            <span className="shrink-0 text-xs text-muted-foreground">
                                                Ayah {ayah.ayahNumber}
                                            </span>
                                            {ayah.isBookmarked && (
                                                <span
                                                    title="Bookmarked"
                                                    className="text-primary"
                                                >
                                                    <Bookmark
                                                        aria-hidden="true"
                                                        className="size-3 fill-current"
                                                    />
                                                    <span className="sr-only">
                                                        Bookmarked
                                                    </span>
                                                </span>
                                            )}
                                            {ayah.reflection && (
                                                <span
                                                    title="Has a reflection"
                                                    className="text-accent-foreground"
                                                >
                                                    <NotebookPen
                                                        aria-hidden="true"
                                                        className="size-3.5"
                                                    />
                                                    <span className="sr-only">
                                                        Has a reflection
                                                    </span>
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                asChild
                                                variant="ghost"
                                                size="sm"
                                                className="text-primary hover:text-primary"
                                            >
                                                <Link href={href}>
                                                    Open in reader
                                                    <ArrowRight aria-hidden="true" />
                                                </Link>
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                size="sm"
                                                onClick={() =>
                                                    setActiveAyah(ayah)
                                                }
                                                aria-label={`Open actions for ${ayah.surahName}, ayah ${ayah.ayahNumber}`}
                                            >
                                                <Ellipsis aria-hidden="true" />
                                                Actions
                                            </Button>
                                        </div>
                                    </div>
                                    <Link
                                        href={href}
                                        className="mt-4 block rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    >
                                        <p
                                            dir="rtl"
                                            lang="ar"
                                            className="ayah line-clamp-2 text-right text-2xl leading-[1.9] text-foreground transition-colors group-hover:text-foreground/80 sm:text-[1.7rem]"
                                        >
                                            {ayah.arabicText}
                                        </p>
                                    </Link>
                                    {ayah.reflection && (
                                        <div className="mt-4 border-l-2 border-primary/25 pl-4">
                                            <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
                                                {ayah.reflection}
                                            </p>
                                        </div>
                                    )}
                                </article>
                            );
                        })}
                    </div>

                    <div className="mt-3 flex flex-col gap-3 border-t border-primary/15 pt-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                        <p aria-live="polite">
                            Showing {firstVisibleIndex + 1}–
                            {Math.min(
                                firstVisibleIndex + AYAH_ITEMS_PER_PAGE,
                                filteredAyahs.length,
                            )}{" "}
                            of {filteredAyahs.length} saved{" "}
                            {filteredAyahs.length === 1 ? "ayah" : "ayahs"}
                        </p>
                        {pageCount > 1 && (
                            <div className="flex items-center gap-1">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    disabled={currentPage === 1}
                                    onClick={() =>
                                        setRequestedPage(currentPage - 1)
                                    }
                                >
                                    <ChevronLeft aria-hidden="true" />
                                    Previous
                                </Button>
                                <span className="px-2 font-medium text-foreground">
                                    {currentPage} / {pageCount}
                                </span>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    disabled={currentPage === pageCount}
                                    onClick={() =>
                                        setRequestedPage(currentPage + 1)
                                    }
                                >
                                    Next
                                    <ChevronRight aria-hidden="true" />
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            )}
            {activeAyah && (
                <SavedAyahActions
                    ayah={activeAyah}
                    onCloseAction={() => setActiveAyah(null)}
                />
            )}
        </section>
    );
}
