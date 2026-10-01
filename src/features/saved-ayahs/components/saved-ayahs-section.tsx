"use client";

import {
    ArrowRight,
    Bookmark,
    Check,
    ChevronLeft,
    ChevronRight,
    Ellipsis,
    FolderHeart,
    FolderPlus,
    LoaderCircle,
    NotebookPen,
    Plus,
    Search,
    SearchX,
    Trash2,
    X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import SectionHeading from "@/components/section-heading";
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
import {
    createBookmarkCollection,
    deleteBookmarkCollection,
} from "../server/manage-bookmark-collections";
import type { BookmarkCollection, SavedAyah } from "../types";
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
    collections: initialCollections,
    readingMode,
}: {
    savedAyahs: SavedAyah[];
    collections: BookmarkCollection[];
    readingMode: ReadingMode;
}) {
    const t = useTranslations("Dashboard");
    const locale = useLocale();
    const router = useRouter();
    const numberFormatter = useMemo(
        () => new Intl.NumberFormat(locale, { useGrouping: false }),
        [locale],
    );
    const [query, setQuery] = useState("");
    const [surahFilter, setSurahFilter] = useState("all");
    const [collectionFilter, setCollectionFilter] = useState("all");
    const [collections, setCollections] = useState(initialCollections);
    const [isCreatingCollection, setIsCreatingCollection] = useState(false);
    const [collectionDraft, setCollectionDraft] = useState("");
    const [pendingCollectionId, setPendingCollectionId] = useState<
        string | null
    >(null);
    const [confirmingCollectionId, setConfirmingCollectionId] = useState<
        string | null
    >(null);
    const [requestedPage, setRequestedPage] = useState(1);
    const [activeAyah, setActiveAyah] = useState<SavedAyah | null>(null);
    useEffect(() => setCollections(initialCollections), [initialCollections]);
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
            const matchesCollection =
                collectionFilter === "all" ||
                (collectionFilter === "unfiled"
                    ? ayah.collections.length === 0
                    : ayah.collections.some(
                          (collection) => collection.id === collectionFilter,
                      ));
            const searchableText = normalizeSearch(
                `${ayah.surahName} ${ayah.surahNumber} ${ayah.ayahNumber} ${ayah.arabicText} ${ayah.reflection ?? ""}`,
            );

            return (
                matchesSurah &&
                matchesCollection &&
                (!normalizedQuery || searchableText.includes(normalizedQuery))
            );
        });
    }, [collectionFilter, query, savedAyahs, surahFilter]);
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

    async function createCollection() {
        const name = collectionDraft.trim();
        if (!name) return;
        setPendingCollectionId("new");
        const result = await createBookmarkCollection({ name });
        setPendingCollectionId(null);

        if (!result.success || !result.collection) {
            toast.error(t("saved.collectionCreateFailed"));
            return;
        }

        setCollections((current) => {
            if (current.some((item) => item.id === result.collection?.id)) {
                return current;
            }
            return [
                ...current,
                { ...result.collection, ayahCount: 0 } as BookmarkCollection,
            ];
        });
        setCollectionDraft("");
        setIsCreatingCollection(false);
        toast.success(t("saved.collectionCreated"));
        router.refresh();
    }

    async function removeCollection(collection: BookmarkCollection) {
        setPendingCollectionId(collection.id);
        const result = await deleteBookmarkCollection(collection.id);
        setPendingCollectionId(null);

        if (!result.success) {
            toast.error(t("saved.collectionDeleteFailed"));
            return;
        }

        setCollections((current) =>
            current.filter((item) => item.id !== collection.id),
        );
        if (collectionFilter === collection.id) setCollectionFilter("all");
        setConfirmingCollectionId(null);
        toast.success(t("saved.collectionDeleted", { name: collection.name }));
        router.refresh();
    }

    if (savedAyahs.length === 0) {
        return (
            <section className="mt-8" aria-labelledby="saved-ayahs-title">
                <p className="sr-only">{t("saved.eyebrow")}</p>
                <div className="app-card mt-4 grid gap-4 p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:p-5">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Bookmark aria-hidden="true" className="size-5" />
                    </span>
                    <div className="min-w-0">
                        <h2
                            id="saved-ayahs-title"
                            className="font-semibold leading-6"
                        >
                            {t("saved.emptyTitle")}
                        </h2>
                        <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                            {t("saved.emptyDescription")}
                        </p>
                    </div>
                    <Button
                        asChild
                        variant="ghost"
                        className="w-fit rounded-xl px-4 text-primary hover:text-primary"
                    >
                        <Link href="/quran">
                            {t("saved.emptyAction")}
                            <ArrowRight
                                aria-hidden="true"
                                className={locale === "ar" ? "rotate-180" : ""}
                            />
                        </Link>
                    </Button>
                </div>
            </section>
        );
    }

    return (
        <section className="mt-6" aria-label={t("saved.collectionsTitle")}>
            <div className="app-card p-3 sm:p-4">
                {savedAyahs.length > 0 && (
                    <div className="flex w-full flex-col gap-3 sm:flex-row">
                        <label
                            htmlFor="saved-ayah-search"
                            className="relative block min-w-0 flex-1"
                        >
                            <span className="sr-only">
                                {t("saved.searchLabel")}
                            </span>
                            <Search
                                aria-hidden="true"
                                className="absolute top-1/2 start-3 size-4 -translate-y-1/2 text-muted-foreground"
                            />
                            <Input
                                id="saved-ayah-search"
                                value={query}
                                onChange={(event) => {
                                    setQuery(event.target.value);
                                    setRequestedPage(1);
                                }}
                                placeholder={t("saved.searchPlaceholder")}
                                className="h-11 rounded-xl border-border/70 bg-background ps-9 text-start shadow-none"
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
                                `${numberFormatter.format(surah.number)}. ${surah.name}`
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
                                aria-label={t("saved.filterLabel")}
                                placeholder={t("saved.allSurahs")}
                                showClear
                                className="h-11 w-full rounded-xl border-border/70 bg-background shadow-none sm:w-52"
                            />
                            <ComboboxContent
                                dir={locale === "ar" ? "rtl" : "ltr"}
                                className="w-[min(20rem,calc(100vw-2rem))] min-w-0 rounded-xl bg-popover/98 p-1 shadow-xl ring-primary/10 backdrop-blur-md"
                            >
                                <ComboboxEmpty>
                                    {t("saved.noMatchingSurahs")}
                                </ComboboxEmpty>
                                <ComboboxList className="max-h-72 p-1">
                                    {(surah: {
                                        number: number;
                                        name: string;
                                    }) => (
                                        <ComboboxItem
                                            key={surah.number}
                                            value={surah}
                                            className="rounded-lg px-3 py-2.5 pe-9 data-highlighted:bg-primary/8"
                                        >
                                            {numberFormatter.format(
                                                surah.number,
                                            )}
                                            . {surah.name}
                                        </ComboboxItem>
                                    )}
                                </ComboboxList>
                            </ComboboxContent>
                        </Combobox>
                    </div>
                )}
            </div>

            {savedAyahs.length > 0 && (
                <div className="app-card mt-3 p-4 sm:p-5">
                    <SectionHeading
                        title={t("saved.collectionsTitle")}
                        description={t("saved.collectionsDescription")}
                        icon={<FolderHeart />}
                        actions={
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                    setIsCreatingCollection((value) => !value)
                                }
                                className="min-h-11 rounded-xl text-primary hover:text-primary"
                            >
                                <Plus />
                                {t("saved.newCollection")}
                            </Button>
                        }
                    />

                    {isCreatingCollection && (
                        <form
                            className="mt-3 flex gap-2 rounded-xl bg-background/70 p-2"
                            onSubmit={(event) => {
                                event.preventDefault();
                                createCollection();
                            }}
                        >
                            <Input
                                autoFocus
                                value={collectionDraft}
                                maxLength={40}
                                onChange={(event) =>
                                    setCollectionDraft(event.target.value)
                                }
                                placeholder={t("saved.collectionPlaceholder")}
                                aria-label={t("saved.collectionName")}
                                className="h-10 border-0 bg-transparent shadow-none"
                            />
                            <Button
                                type="submit"
                                size="sm"
                                disabled={
                                    pendingCollectionId === "new" ||
                                    !collectionDraft.trim()
                                }
                                className="h-10 shrink-0 rounded-lg"
                            >
                                {pendingCollectionId === "new" ? (
                                    <LoaderCircle className="animate-spin" />
                                ) : (
                                    <FolderPlus />
                                )}
                                {t("saved.createCollection")}
                            </Button>
                        </form>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setCollectionFilter("all");
                                setRequestedPage(1);
                            }}
                            className={`min-h-11 shrink-0 rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors ${
                                collectionFilter === "all"
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-background/70 text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            {t("saved.allCollections", {
                                count: savedAyahs.length,
                            })}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setCollectionFilter("unfiled");
                                setRequestedPage(1);
                            }}
                            className={`min-h-11 shrink-0 rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors ${
                                collectionFilter === "unfiled"
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-background/70 text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            {t("saved.unfiled")}
                        </button>
                        {collections.map((collection) => (
                            <div
                                key={collection.id}
                                className={`flex min-h-11 shrink-0 items-center overflow-hidden rounded-xl transition-colors ${
                                    collectionFilter === collection.id
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-background/70 text-muted-foreground"
                                }`}
                            >
                                <button
                                    type="button"
                                    onClick={() => {
                                        setCollectionFilter(collection.id);
                                        setRequestedPage(1);
                                    }}
                                    className="min-h-11 py-2 ps-3.5 pe-2 text-xs font-semibold hover:text-foreground"
                                >
                                    {collection.name}
                                    <span className="ms-1.5 opacity-65">
                                        {collection.ayahCount}
                                    </span>
                                </button>
                                {confirmingCollectionId === collection.id && (
                                    <button
                                        type="button"
                                        disabled={
                                            pendingCollectionId ===
                                            collection.id
                                        }
                                        onClick={() =>
                                            setConfirmingCollectionId(null)
                                        }
                                        aria-label={t(
                                            "saved.cancelDeleteCollection",
                                        )}
                                        className="flex size-11 items-center justify-center rounded-lg opacity-70 transition-opacity hover:bg-background/30 hover:opacity-100 disabled:opacity-30"
                                    >
                                        <X className="size-3" />
                                    </button>
                                )}
                                <button
                                    type="button"
                                    disabled={
                                        pendingCollectionId === collection.id
                                    }
                                    onClick={() => {
                                        if (
                                            confirmingCollectionId ===
                                            collection.id
                                        ) {
                                            removeCollection(collection);
                                            return;
                                        }
                                        setConfirmingCollectionId(
                                            collection.id,
                                        );
                                    }}
                                    aria-label={t(
                                        confirmingCollectionId === collection.id
                                            ? "saved.confirmDeleteCollection"
                                            : "saved.deleteCollection",
                                        { name: collection.name },
                                    )}
                                    className="me-1 flex size-11 items-center justify-center rounded-lg opacity-55 transition-opacity hover:bg-destructive/12 hover:text-destructive hover:opacity-100 disabled:opacity-30"
                                >
                                    {pendingCollectionId === collection.id ? (
                                        <LoaderCircle className="size-3 animate-spin" />
                                    ) : confirmingCollectionId ===
                                      collection.id ? (
                                        <Check className="size-3" />
                                    ) : (
                                        <Trash2 className="size-3" />
                                    )}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {filteredAyahs.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-center">
                    <span className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <SearchX aria-hidden="true" className="size-5" />
                    </span>
                    <p className="mt-4 text-sm text-muted-foreground">
                        {t("saved.noSearchResults")}
                    </p>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="mt-2 text-primary"
                        onClick={() => {
                            setQuery("");
                            setSurahFilter("all");
                            setCollectionFilter("all");
                            setRequestedPage(1);
                        }}
                    >
                        {t("saved.clearSearch")}
                    </Button>
                </div>
            ) : (
                <div>
                    <div className="mt-5 space-y-4">
                        {visibleAyahs.map((ayah) => {
                            const locationNumber =
                                readingMode === "page"
                                    ? ayah.pageNumber
                                    : ayah.surahNumber;
                            const href = `/quran/${readingMode}/${locationNumber}#ayah-${ayah.globalAyahNumber}`;

                            return (
                                <article
                                    key={ayah.globalAyahNumber}
                                    className="group app-card p-4 sm:p-5"
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div className="flex min-w-0 items-center gap-2.5">
                                            <span className="text-sm font-semibold text-primary">
                                                {ayah.surahName}
                                            </span>
                                            <span
                                                aria-hidden="true"
                                                className="size-1 rounded-full bg-primary/30"
                                            />
                                            <span className="shrink-0 text-xs text-muted-foreground">
                                                {t("saved.ayah", {
                                                    number: ayah.ayahNumber,
                                                })}
                                            </span>
                                            {ayah.isBookmarked && (
                                                <span
                                                    title={t(
                                                        "saved.bookmarked",
                                                    )}
                                                    className="text-primary"
                                                >
                                                    <Bookmark
                                                        aria-hidden="true"
                                                        className="size-3 fill-current"
                                                    />
                                                    <span className="sr-only">
                                                        {t("saved.bookmarked")}
                                                    </span>
                                                </span>
                                            )}
                                            {ayah.reflection && (
                                                <span
                                                    title={t(
                                                        "saved.hasReflection",
                                                    )}
                                                    className="text-accent-foreground"
                                                >
                                                    <NotebookPen
                                                        aria-hidden="true"
                                                        className="size-3.5"
                                                    />
                                                    <span className="sr-only">
                                                        {t(
                                                            "saved.hasReflection",
                                                        )}
                                                    </span>
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                asChild
                                                variant="ghost"
                                                size="sm"
                                                className="min-h-11 rounded-xl text-primary hover:text-primary"
                                            >
                                                <Link href={href}>
                                                    {t("saved.openReader")}
                                                    <ArrowRight
                                                        aria-hidden="true"
                                                        className={
                                                            locale === "ar"
                                                                ? "rotate-180"
                                                                : undefined
                                                        }
                                                    />
                                                </Link>
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon-sm"
                                                onClick={() =>
                                                    setActiveAyah(ayah)
                                                }
                                                className="min-h-11 min-w-11 rounded-xl text-muted-foreground hover:bg-primary/10 hover:text-primary"
                                                title={t("saved.actionTitle")}
                                                aria-label={t(
                                                    "saved.openActions",
                                                    {
                                                        surah: ayah.surahName,
                                                        number: ayah.ayahNumber,
                                                    },
                                                )}
                                            >
                                                <Ellipsis aria-hidden="true" />
                                                <span className="sr-only">
                                                    {t("saved.actions")}
                                                </span>
                                            </Button>
                                        </div>
                                    </div>
                                    {ayah.collections.length > 0 && (
                                        <div className="mt-3 flex flex-wrap gap-1.5">
                                            {ayah.collections.map(
                                                (collection) => (
                                                    <button
                                                        key={collection.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setCollectionFilter(
                                                                collection.id,
                                                            );
                                                            setRequestedPage(1);
                                                        }}
                                                        className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-primary/8 px-2.5 py-1 text-[0.7rem] font-medium text-primary transition-colors hover:bg-primary/14"
                                                    >
                                                        <FolderHeart className="size-3" />
                                                        {collection.name}
                                                    </button>
                                                ),
                                            )}
                                        </div>
                                    )}
                                    <Link
                                        href={href}
                                        className="mt-5 block rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    >
                                        <p
                                            dir="rtl"
                                            lang="ar"
                                            className="ayah quran-display-text line-clamp-2 text-right leading-[1.9] text-foreground transition-colors group-hover:text-foreground/80"
                                        >
                                            {ayah.arabicText}
                                        </p>
                                    </Link>
                                    {ayah.reflection && (
                                        <div className="mt-4 rounded-xl border-s-2 border-primary/25 bg-muted/30 px-4 py-3">
                                            <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
                                                {ayah.reflection}
                                            </p>
                                        </div>
                                    )}
                                </article>
                            );
                        })}
                    </div>

                    <div className="mt-5 flex flex-col gap-3 border-t border-border/60 pt-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                        <p aria-live="polite">
                            {t("saved.summary", {
                                start: firstVisibleIndex + 1,
                                end: Math.min(
                                    firstVisibleIndex + AYAH_ITEMS_PER_PAGE,
                                    filteredAyahs.length,
                                ),
                                count: filteredAyahs.length,
                            })}
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
                                    <ChevronLeft
                                        aria-hidden="true"
                                        className={
                                            locale === "ar"
                                                ? "rotate-180"
                                                : undefined
                                        }
                                    />
                                    {t("saved.previous")}
                                </Button>
                                <span className="px-2 font-medium text-foreground">
                                    {t("saved.pageIndicator", {
                                        current: currentPage,
                                        total: pageCount,
                                    })}
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
                                    {t("saved.next")}
                                    <ChevronRight
                                        aria-hidden="true"
                                        className={
                                            locale === "ar"
                                                ? "rotate-180"
                                                : undefined
                                        }
                                    />
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
