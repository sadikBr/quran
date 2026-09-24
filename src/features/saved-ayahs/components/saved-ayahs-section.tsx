"use client";

import {
    ArrowRight,
    Bookmark,
    BookOpen,
    NotebookPen,
    Search,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
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
                                onChange={(event) =>
                                    setQuery(event.target.value)
                                }
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
                            onValueChange={(surah) =>
                                setSurahFilter(
                                    surah ? surah.number.toString() : "all",
                                )
                            }
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
                <div className="divide-y divide-primary/10">
                    {filteredAyahs.map((ayah) => {
                        const locationNumber =
                            readingMode === "page"
                                ? ayah.pageNumber
                                : ayah.surahNumber;
                        const href = `/quran/${readingMode}/${locationNumber}#ayah-${ayah.globalAyahNumber}`;

                        return (
                            <article
                                key={ayah.globalAyahNumber}
                                className="group py-7"
                            >
                                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
                                            <span className="font-semibold text-primary">
                                                {ayah.surahName}
                                            </span>
                                            <span aria-hidden="true">·</span>
                                            <span>Ayah {ayah.ayahNumber}</span>
                                            {ayah.isBookmarked && (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-primary/8 px-2 py-1 text-primary">
                                                    <Bookmark
                                                        aria-hidden="true"
                                                        className="size-3 fill-current"
                                                    />
                                                    Bookmarked
                                                </span>
                                            )}
                                            {ayah.reflection && (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-1 text-accent-foreground">
                                                    <NotebookPen
                                                        aria-hidden="true"
                                                        className="size-3"
                                                    />
                                                    Reflection
                                                </span>
                                            )}
                                        </div>
                                        <p
                                            dir="rtl"
                                            lang="ar"
                                            className="ayah mt-4 text-right text-2xl leading-[1.9] text-foreground sm:text-3xl"
                                        >
                                            {ayah.arabicText}
                                        </p>
                                        {ayah.reflection && (
                                            <p className="mt-4 max-w-3xl border-l-2 border-primary/25 pl-4 text-sm leading-6 whitespace-pre-wrap text-muted-foreground">
                                                {ayah.reflection}
                                            </p>
                                        )}
                                    </div>
                                    <Link
                                        href={href}
                                        className="inline-flex shrink-0 items-center gap-2 self-start rounded-md px-1 py-1 text-sm font-medium text-primary outline-none transition-colors hover:text-primary/75 focus-visible:ring-2 focus-visible:ring-ring"
                                    >
                                        Open in reader
                                        <ArrowRight
                                            aria-hidden="true"
                                            className="size-4 transition-transform group-hover:translate-x-0.5"
                                        />
                                    </Link>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
