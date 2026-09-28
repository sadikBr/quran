"use client";

import {
    ArrowLeft,
    Bookmark,
    BookOpenText,
    Check,
    ChevronDown,
    Copy,
    FolderHeart,
    FolderPlus,
    ImageDown,
    LoaderCircle,
    NotebookPen,
    Pause,
    Play,
    RefreshCcw,
    Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    createBookmarkCollection,
    updateBookmarkCollections,
} from "@/features/saved-ayahs/server/manage-bookmark-collections";
import {
    updateBookmark,
    updateReflection,
} from "@/features/saved-ayahs/server/update-saved-ayah";
import type {
    BookmarkCollection,
    SavedAyahMetadata,
} from "@/features/saved-ayahs/types";
import { getArabicNumber } from "@/lib/arabic-numbers";
import getTafsirAyah from "../server/get-tafsir-ayah";
import type { Edition } from "../types";
import AyahShareCard from "./ayah-share-card";
import EditionCombobox from "./edition-combobox";
import { useQuranAudio } from "./quran-audio-provider";
import TajweedText, { getPlainQuranText } from "./tajweed-text";

function TafsirReadingPane({
    text,
    isLoading,
    direction,
}: {
    text: string;
    isLoading: boolean;
    direction: string;
}) {
    const t = useTranslations("Reader");
    const tafsirScrollRef = useRef<HTMLElement>(null);
    const [hasMoreTafsir, setHasMoreTafsir] = useState(false);
    const isRightToLeft = direction === "rtl";

    useEffect(() => {
        const tafsirElement = tafsirScrollRef.current;

        if (!tafsirElement) return;

        const updateScrollState = () => {
            const remainingSpace =
                tafsirElement.scrollHeight -
                tafsirElement.scrollTop -
                tafsirElement.clientHeight;

            setHasMoreTafsir(remainingSpace > 4);
        };

        updateScrollState();
        tafsirElement.addEventListener("scroll", updateScrollState, {
            passive: true,
        });

        return () => {
            tafsirElement.removeEventListener("scroll", updateScrollState);
        };
    }, []);

    return (
        <div className="relative mt-3">
            <section
                ref={tafsirScrollRef}
                // biome-ignore lint/a11y/noNoninteractiveTabindex: Allow keyboard scrolling of the commentary.
                tabIndex={0}
                aria-label={t("actions.tafsirCommentary")}
                className="max-h-[min(42dvh,32rem)] overflow-y-auto overscroll-contain rounded-sm px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
                <p
                    dir={isRightToLeft ? "rtl" : "ltr"}
                    lang={isRightToLeft ? "ar" : undefined}
                    className={`pt-2 pb-5 whitespace-pre-line text-start text-card-foreground/90 transition-opacity ${
                        isRightToLeft
                            ? "font-(family-name:--font-tafsir) text-lg leading-[2.05] sm:text-xl sm:leading-[2.15]"
                            : "font-serif text-base leading-8 sm:text-lg sm:leading-9"
                    } ${isLoading ? "opacity-35" : ""}`}
                    style={{ textAlignLast: isRightToLeft ? "right" : "left" }}
                >
                    {text}
                </p>
            </section>
            {hasMoreTafsir && (
                <button
                    type="button"
                    onClick={() =>
                        tafsirScrollRef.current?.scrollBy({
                            top: tafsirScrollRef.current.clientHeight * 0.7,
                            behavior: window.matchMedia(
                                "(prefers-reduced-motion: reduce)",
                            ).matches
                                ? "auto"
                                : "smooth",
                        })
                    }
                    className="mx-auto mt-2 flex items-center gap-1.5 rounded-md px-3 py-2 text-xs text-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    {t("actions.continueReading")}
                    <ChevronDown aria-hidden="true" className="size-3" />
                </button>
            )}
        </div>
    );
}

function QuranAyahPreview({
    text,
    ayahNumber,
}: {
    text: string;
    ayahNumber: number;
}) {
    const t = useTranslations("Reader");
    const textRef = useRef<HTMLParagraphElement>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isCollapsible, setIsCollapsible] = useState(false);

    useEffect(() => {
        if (isExpanded) return;

        const textElement = textRef.current;
        if (!textElement) return;

        const updateOverflow = () => {
            setIsCollapsible(
                textElement.scrollHeight > textElement.clientHeight + 2,
            );
        };
        const resizeObserver = new ResizeObserver(updateOverflow);

        updateOverflow();
        resizeObserver.observe(textElement);

        return () => resizeObserver.disconnect();
    }, [isExpanded]);

    return (
        <figure className="my-6 px-1">
            <figcaption className="sr-only">
                {t("actions.quranAyah", { number: ayahNumber })}
            </figcaption>
            <div className="relative">
                <p
                    ref={textRef}
                    dir="rtl"
                    lang="ar"
                    style={
                        isCollapsible && !isExpanded
                            ? {
                                  maskImage:
                                      "linear-gradient(to bottom, black 65%, transparent)",
                              }
                            : undefined
                    }
                    className={`ayah quran-display-text mt-3 text-center leading-loose text-foreground sm:leading-[2.1] ${
                        isExpanded ? "" : "max-h-36 overflow-hidden sm:max-h-40"
                    }`}
                >
                    <TajweedText text={text} />
                </p>
            </div>
            {isCollapsible && (
                <button
                    type="button"
                    aria-expanded={isExpanded}
                    onClick={() => setIsExpanded((expanded) => !expanded)}
                    className="mx-auto mt-3 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    {isExpanded
                        ? t("actions.showLess")
                        : t("actions.showFullAyah")}
                    <ChevronDown
                        aria-hidden="true"
                        className={`size-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    />
                </button>
            )}
        </figure>
    );
}

export type AyahActionsProps = {
    surahName: string;
    surahArabicName: string;
    riwayah: "hafs" | "warsh";
    ayahNumber: number;
    arabicText: string;
    translationText: string;
    translationEditionName: string;
    tafsirText: string;
    tafsirEditionName: string;
    tafsirEditionIdentifier: string;
    tafsirDirection: string;
    audioStreams: string[];
    globalAyahNumber: number;
    surahNumber: number;
    tafsirEditions: Edition[];
    canChooseTafsir: boolean;
    canSaveAyah: boolean;
    initialBookmarked: boolean;
    initialReflection: string;
    initialCollections: BookmarkCollection[];
    initialCollectionIds: string[];
    savedAyahMetadata: SavedAyahMetadata;
    closeOnCopy?: boolean;
    onSavedAyahChangeAction?: () => void;
};

function SurahTitle({
    locale,
    surahNumber,
    surahName,
}: {
    locale: string;
    surahNumber: number;
    surahName: string;
}) {
    if (locale === "ar") {
        return (
            <span className="surah-name block max-w-full text-[clamp(2.25rem,10vw,3.25rem)] font-normal leading-none tracking-normal text-foreground">
                {getArabicNumber(surahNumber)}
            </span>
        );
    }

    return <>{surahName}</>;
}

export default function AyahActions({
    surahName,
    riwayah,
    ayahNumber,
    arabicText,
    translationText,
    translationEditionName,
    tafsirText,
    tafsirEditionName,
    tafsirEditionIdentifier,
    tafsirDirection,
    audioStreams,
    globalAyahNumber,
    surahNumber,
    tafsirEditions,
    canChooseTafsir,
    canSaveAyah,
    initialBookmarked,
    initialReflection,
    initialCollections,
    initialCollectionIds,
    savedAyahMetadata,
    closeOnCopy = false,
    onSavedAyahChangeAction,
}: AyahActionsProps) {
    const router = useRouter();
    const t = useTranslations("Reader");
    const commonT = useTranslations("Common");
    const locale = useLocale();
    const direction = locale === "ar" ? "rtl" : "ltr";
    const [isTafsirVisible, setIsTafsirVisible] = useState(false);
    const [selectedTafsirIdentifier, setSelectedTafsirIdentifier] = useState(
        tafsirEditionIdentifier,
    );
    const [selectedTafsir, setSelectedTafsir] = useState({
        text: tafsirText,
        editionName: tafsirEditionName,
        direction: tafsirDirection,
    });
    const [isChangingTafsir, setIsChangingTafsir] = useState(false);
    const [isReflectionVisible, setIsReflectionVisible] = useState(false);
    const [isCollectionsVisible, setIsCollectionsVisible] = useState(false);
    const [isShareVisible, setIsShareVisible] = useState(false);
    const [isBookmarked, setIsBookmarked] = useState(initialBookmarked);
    const [collections, setCollections] = useState(initialCollections);
    const [collectionIds, setCollectionIds] = useState(initialCollectionIds);
    const [collectionDraft, setCollectionDraft] = useState("");
    const [reflection, setReflection] = useState(initialReflection);
    const [reflectionDraft, setReflectionDraft] = useState(initialReflection);
    const [isSavingBookmark, setIsSavingBookmark] = useState(false);
    const [isSavingReflection, setIsSavingReflection] = useState(false);
    const [isSavingCollections, setIsSavingCollections] = useState(false);
    const [isCreatingCollection, setIsCreatingCollection] = useState(false);
    const {
        activeAyahNumber,
        isPlaying,
        playbackStatus,
        retryAudio,
        toggleAudio,
    } = useQuranAudio();
    const isCurrentAyah = activeAyahNumber === globalAyahNumber;
    const isPlayingThisAyah = isCurrentAyah && isPlaying;
    const isLoadingThisAyah = isCurrentAyah && playbackStatus === "loading";
    const hasPlaybackError = isCurrentAyah && playbackStatus === "error";
    async function copyArabicText() {
        try {
            await navigator.clipboard.writeText(getPlainQuranText(arabicText));
            toast.success(t("actions.copied"));

            if (closeOnCopy) {
                router.back();
            }
        } catch {
            toast.error(t("actions.copyFailed"));
        }
    }

    async function changeTafsirEdition(editionIdentifier: string) {
        if (editionIdentifier === selectedTafsirIdentifier) return;

        setIsChangingTafsir(true);

        try {
            const ayah = await getTafsirAyah(
                globalAyahNumber,
                editionIdentifier,
            );
            setSelectedTafsirIdentifier(editionIdentifier);
            setSelectedTafsir({
                text: ayah.text,
                editionName:
                    locale === "ar"
                        ? ayah.edition.name || ayah.edition.englishName
                        : ayah.edition.englishName || ayah.edition.name,
                direction: ayah.edition.direction,
            });
        } catch {
            toast.error(t("actions.tafsirLoadFailed"));
        } finally {
            setIsChangingTafsir(false);
        }
    }

    async function toggleBookmark() {
        if (!canSaveAyah) {
            toast.error(t("actions.signInBookmarks"));
            return;
        }

        const nextBookmarkedState = !isBookmarked;
        setIsBookmarked(nextBookmarkedState);
        setIsSavingBookmark(true);

        const result = await updateBookmark({
            ...savedAyahMetadata,
            isBookmarked: nextBookmarkedState,
        });

        setIsSavingBookmark(false);

        if (!result.success) {
            setIsBookmarked(!nextBookmarkedState);
            toast.error(commonT("feedback.bookmarkUpdateFailed"));
            return;
        }

        toast.success(
            nextBookmarkedState
                ? t("actions.bookmarked")
                : t("actions.bookmarkRemoved"),
        );
        if (!nextBookmarkedState) {
            setCollectionIds([]);
            setIsCollectionsVisible(false);
        } else {
            setIsCollectionsVisible(true);
        }
        onSavedAyahChangeAction?.();
    }

    async function toggleCollection(collectionId: string) {
        const previousIds = collectionIds;
        const nextIds = collectionIds.includes(collectionId)
            ? collectionIds.filter((id) => id !== collectionId)
            : [...collectionIds, collectionId];
        setCollectionIds(nextIds);
        setIsSavingCollections(true);
        const result = await updateBookmarkCollections({
            globalAyahNumber,
            collectionIds: nextIds,
        });
        setIsSavingCollections(false);

        if (!result.success) {
            setCollectionIds(previousIds);
            toast.error(t("actions.collectionUpdateFailed"));
            return;
        }
        onSavedAyahChangeAction?.();
    }

    async function createCollection(suggestedName?: string) {
        const name = (suggestedName ?? collectionDraft).trim();
        if (!name) return;

        setIsCreatingCollection(true);
        const result = await createBookmarkCollection({
            name,
            globalAyahNumber,
        });
        setIsCreatingCollection(false);

        if (!result.success || !result.collection) {
            toast.error(t("actions.collectionCreateFailed"));
            return;
        }
        const newCollection = result.collection;

        setCollections((current) => {
            if (current.some((item) => item.id === newCollection.id)) {
                return current;
            }
            return [
                ...current,
                { ...newCollection, ayahCount: 1 } as BookmarkCollection,
            ];
        });
        setCollectionIds((current) =>
            current.includes(newCollection.id)
                ? current
                : [...current, newCollection.id],
        );
        setCollectionDraft("");
        toast.success(t("actions.collectionCreated"));
        onSavedAyahChangeAction?.();
    }

    function openReflection() {
        if (!canSaveAyah) {
            toast.error(t("actions.signInReflections"));
            return;
        }

        setReflectionDraft(reflection);
        setIsReflectionVisible(true);
    }

    async function saveReflection(value: string) {
        setIsSavingReflection(true);
        const result = await updateReflection({
            ...savedAyahMetadata,
            reflection: value,
        });
        setIsSavingReflection(false);

        if (!result.success) {
            toast.error(commonT("feedback.reflectionSaveFailed"));
            return;
        }

        const savedValue = value.trim();
        setReflection(savedValue);
        setReflectionDraft(savedValue);
        toast.success(
            savedValue
                ? t("actions.reflectionSaved")
                : t("actions.reflectionRemoved"),
        );
        onSavedAyahChangeAction?.();
    }

    if (isShareVisible) {
        return (
            <AyahShareCard
                arabicText={getPlainQuranText(arabicText)}
                translationText={translationText}
                translationEditionName={translationEditionName}
                surahName={surahName}
                surahNumber={surahNumber}
                ayahNumber={ayahNumber}
                riwayah={riwayah}
                onBack={() => setIsShareVisible(false)}
            />
        );
    }

    if (isCollectionsVisible) {
        return (
            <div dir={direction} className="pb-1">
                <button
                    type="button"
                    onClick={() => setIsCollectionsVisible(false)}
                    className="inline-flex items-center gap-2 rounded-md text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    <ArrowLeft
                        aria-hidden="true"
                        className="size-4 rtl:rotate-180"
                    />
                    {t("actions.back")}
                </button>
                <header className="relative mt-7 pe-9">
                    <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <FolderHeart className="size-5" />
                    </div>
                    <h1
                        id="ayah-actions-title"
                        className="mt-4 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
                    >
                        {t("actions.organizeBookmark")}
                    </h1>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {t("actions.organizeDescription")}
                    </p>
                </header>

                <div className="mt-6 space-y-2" aria-busy={isSavingCollections}>
                    {collections.length === 0 ? (
                        <div className="rounded-2xl bg-muted/40 px-5 py-6 text-center">
                            <p className="font-medium">
                                {t("actions.noCollections")}
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {t("actions.noCollectionsDescription")}
                            </p>
                            <div className="mt-4 flex flex-wrap justify-center gap-2">
                                {(
                                    [
                                        "duas",
                                        "study",
                                        "memorization",
                                        "reflections",
                                    ] as const
                                ).map((suggestion) => (
                                    <button
                                        key={suggestion}
                                        type="button"
                                        disabled={isCreatingCollection}
                                        onClick={() =>
                                            createCollection(
                                                t(
                                                    `actions.collectionSuggestions.${suggestion}`,
                                                ),
                                            )
                                        }
                                        className="rounded-full bg-background px-3 py-1.5 text-xs font-medium text-primary ring-1 ring-primary/15 transition-colors hover:bg-primary/8 disabled:opacity-50"
                                    >
                                        {t(
                                            `actions.collectionSuggestions.${suggestion}`,
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        collections.map((collection) => {
                            const selected = collectionIds.includes(
                                collection.id,
                            );
                            return (
                                <button
                                    key={collection.id}
                                    type="button"
                                    disabled={isSavingCollections}
                                    aria-pressed={selected}
                                    onClick={() =>
                                        toggleCollection(collection.id)
                                    }
                                    className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-start transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 ${
                                        selected
                                            ? "bg-primary/12 text-foreground ring-1 ring-primary/20"
                                            : "bg-muted/35 text-foreground hover:bg-muted/60"
                                    }`}
                                >
                                    <span
                                        className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${
                                            selected
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-background text-muted-foreground"
                                        }`}
                                    >
                                        {selected ? (
                                            <Check className="size-4" />
                                        ) : (
                                            <FolderHeart className="size-4" />
                                        )}
                                    </span>
                                    <span className="min-w-0 flex-1 truncate font-medium">
                                        {collection.name}
                                    </span>
                                </button>
                            );
                        })
                    )}
                </div>

                <form
                    className="mt-5 rounded-2xl border border-dashed border-primary/25 bg-primary/[0.035] p-4"
                    onSubmit={(event) => {
                        event.preventDefault();
                        createCollection();
                    }}
                >
                    <label
                        htmlFor="new-bookmark-collection"
                        className="text-sm font-semibold"
                    >
                        {t("actions.newCollection")}
                    </label>
                    <div className="mt-2 flex gap-2">
                        <Input
                            id="new-bookmark-collection"
                            value={collectionDraft}
                            maxLength={40}
                            onChange={(event) =>
                                setCollectionDraft(event.target.value)
                            }
                            placeholder={t("actions.collectionPlaceholder")}
                            className="h-11 bg-background/80"
                        />
                        <Button
                            type="submit"
                            disabled={
                                isCreatingCollection || !collectionDraft.trim()
                            }
                            className="h-11 shrink-0"
                        >
                            {isCreatingCollection ? (
                                <LoaderCircle className="animate-spin" />
                            ) : (
                                <FolderPlus />
                            )}
                            <span className="hidden sm:inline">
                                {t("actions.createCollection")}
                            </span>
                        </Button>
                    </div>
                </form>
            </div>
        );
    }

    if (isReflectionVisible) {
        return (
            <div dir={direction} className="pb-1">
                <button
                    type="button"
                    onClick={() => setIsReflectionVisible(false)}
                    className="inline-flex items-center gap-2 rounded-md text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    <ArrowLeft
                        aria-hidden="true"
                        className="size-4 rtl:rotate-180"
                    />
                    {t("actions.back")}
                </button>
                <header className="relative isolate mt-7 pe-9">
                    <p className="text-xs font-semibold tracking-[0.16em] text-primary">
                        {t("actions.privateReflection")}
                    </p>
                    <h1
                        id="ayah-actions-title"
                        className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
                    >
                        <SurahTitle
                            locale={locale}
                            surahNumber={surahNumber}
                            surahName={surahName}
                        />
                        <span className="ms-3 align-middle font-sans text-sm font-normal text-muted-foreground">
                            {t("actions.ayah", { number: ayahNumber })}
                        </span>
                    </h1>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {t("actions.privateNote")}
                    </p>
                </header>

                <p
                    dir="rtl"
                    lang="ar"
                    className="ayah quran-display-text mt-6 rounded-xl bg-muted/45 px-5 py-4 text-center leading-loose text-foreground"
                >
                    <TajweedText text={arabicText} />
                </p>

                <label
                    htmlFor="ayah-reflection"
                    className="mt-6 block text-sm font-medium text-foreground"
                >
                    {t("actions.yourReflection")}
                </label>
                <Textarea
                    id="ayah-reflection"
                    value={reflectionDraft}
                    onChange={(event) =>
                        setReflectionDraft(event.target.value.slice(0, 4000))
                    }
                    placeholder={t("actions.reflectionPlaceholder")}
                    rows={7}
                    className="mt-2 resize-y bg-muted/35 leading-6"
                    disabled={isSavingReflection}
                />
                <div className="mt-2 flex justify-end text-xs text-muted-foreground">
                    {reflectionDraft.length} / 4000
                </div>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                    <div>
                        {reflection && (
                            <Button
                                type="button"
                                variant="ghost"
                                disabled={isSavingReflection}
                                onClick={() => saveReflection("")}
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            >
                                <Trash2 aria-hidden="true" />
                                {t("actions.removeReflection")}
                            </Button>
                        )}
                    </div>
                    <Button
                        type="button"
                        disabled={
                            isSavingReflection ||
                            reflectionDraft.trim() === reflection
                        }
                        onClick={() => saveReflection(reflectionDraft)}
                    >
                        {isSavingReflection && (
                            <LoaderCircle
                                aria-hidden="true"
                                className="animate-spin"
                            />
                        )}
                        {t("actions.saveReflection")}
                    </Button>
                </div>
            </div>
        );
    }

    if (isTafsirVisible) {
        return (
            <div dir={direction} className="pb-1">
                <button
                    type="button"
                    onClick={() => setIsTafsirVisible(false)}
                    className="inline-flex items-center gap-2 rounded-md text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    <ArrowLeft
                        aria-hidden="true"
                        className="size-4 rtl:rotate-180"
                    />
                    {t("actions.back")}
                </button>
                <header className="mt-6 pe-9">
                    <div className="flex items-center gap-3">
                        <span
                            aria-hidden="true"
                            className="h-px w-6 bg-primary/70"
                        />
                        <p className="text-[0.65rem] font-semibold tracking-[0.22em] text-primary">
                            {t("actions.tafsir")}
                        </p>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                        <h1
                            id="ayah-actions-title"
                            className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
                        >
                            <SurahTitle
                                locale={locale}
                                surahNumber={surahNumber}
                                surahName={surahName}
                            />
                        </h1>
                        <span className="text-sm text-muted-foreground">
                            {t("actions.ayah", { number: ayahNumber })}
                        </span>
                    </div>
                </header>
                <QuranAyahPreview text={arabicText} ayahNumber={ayahNumber} />
                <div className="mt-5 space-y-3">
                    <p className="text-[0.65rem] font-semibold tracking-[0.18em] text-primary uppercase">
                        {t("actions.commentary")}
                    </p>
                    <div className="min-w-0 max-w-full">
                        {canChooseTafsir ? (
                            <EditionCombobox
                                ariaLabel={t("actions.chooseTafsir")}
                                editions={tafsirEditions}
                                value={selectedTafsirIdentifier}
                                onValueChange={changeTafsirEdition}
                                disabled={isChangingTafsir}
                                placeholder={t("actions.searchTafsir")}
                                emptyMessage={t("actions.noTafsir")}
                                className="w-full min-w-0 border-primary/15 bg-muted/30 text-sm shadow-none"
                            />
                        ) : (
                            <span className="text-xs text-muted-foreground">
                                {selectedTafsir.editionName}
                            </span>
                        )}
                    </div>
                </div>
                <article
                    className="mt-4 transition-opacity"
                    aria-busy={isChangingTafsir}
                >
                    {isChangingTafsir && (
                        <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                            <LoaderCircle
                                aria-hidden="true"
                                className="size-3.5 animate-spin text-primary"
                            />
                            {t("actions.loadingTafsir")}
                        </p>
                    )}
                    <TafsirReadingPane
                        key={selectedTafsirIdentifier}
                        text={selectedTafsir.text}
                        isLoading={isChangingTafsir}
                        direction={selectedTafsir.direction}
                    />
                </article>
            </div>
        );
    }

    return (
        <div dir={direction} className="min-w-0 pb-1">
            <header className="relative isolate min-w-0 overflow-hidden pb-5 pe-10 pt-1">
                <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -end-6 -top-10 -z-10 size-44 rounded-full bg-primary/8 blur-3xl"
                />
                <div className="flex items-center gap-3">
                    <span
                        aria-hidden="true"
                        className="h-px w-6 bg-primary/70"
                    />
                    <p className="text-[0.65rem] font-semibold tracking-[0.22em] text-primary">
                        {t("actions.title")}
                    </p>
                </div>
                <h1
                    id="ayah-actions-title"
                    className="mt-4 min-w-0 text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-3xl"
                >
                    <SurahTitle
                        locale={locale}
                        surahNumber={surahNumber}
                        surahName={surahName}
                    />
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    {t("actions.ayah", { number: ayahNumber })}
                </p>
            </header>

            <div className="flex min-w-0 flex-col pb-1">
                {audioStreams.length > 0 && (
                    <button
                        type="button"
                        disabled={isLoadingThisAyah}
                        onClick={() =>
                            hasPlaybackError
                                ? retryAudio()
                                : toggleAudio(globalAyahNumber, audioStreams)
                        }
                        className="mb-2 w-full min-w-0 rounded-2xl bg-gradient-to-br from-primary/12 to-primary/5 px-3.5 py-3.5 text-start text-foreground transition-colors hover:from-primary/16 hover:to-primary/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait sm:px-4"
                    >
                        <span className="flex items-center gap-4">
                            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                {isLoadingThisAyah ? (
                                    <LoaderCircle
                                        aria-hidden="true"
                                        className="size-4 animate-spin"
                                    />
                                ) : hasPlaybackError ? (
                                    <RefreshCcw
                                        aria-hidden="true"
                                        className="size-4"
                                    />
                                ) : isPlayingThisAyah ? (
                                    <Pause
                                        aria-hidden="true"
                                        className="size-4 fill-current"
                                    />
                                ) : (
                                    <Play
                                        aria-hidden="true"
                                        className="ml-0.5 size-4 fill-current"
                                    />
                                )}
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="text-[0.65rem] font-semibold tracking-[0.14em] text-primary">
                                    {t("actions.recitation")}
                                </span>
                                <span className="mt-1 block font-medium">
                                    {isLoadingThisAyah
                                        ? t("actions.loadingRecitation")
                                        : hasPlaybackError
                                          ? t("actions.retryRecitation")
                                          : isPlayingThisAyah
                                            ? t("actions.pauseRecitation")
                                            : t("actions.listenAyah")}
                                </span>
                                <span className="mt-1 block text-xs text-muted-foreground">
                                    {isLoadingThisAyah
                                        ? t("actions.preparingRecitation")
                                        : hasPlaybackError
                                          ? t("actions.playbackFailed")
                                          : isPlayingThisAyah
                                            ? t("actions.recitationPlaying")
                                            : t("actions.playSelected")}
                                </span>
                            </span>
                        </span>
                    </button>
                )}
                <button
                    type="button"
                    onClick={() => setIsTafsirVisible(true)}
                    className="group flex w-full min-w-0 items-center gap-3.5 rounded-xl px-2 py-3 text-start transition-colors hover:bg-primary/6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-3 sm:py-3.5"
                >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/9 text-primary transition-[background-color,transform] duration-200 group-hover:bg-primary/15 motion-safe:group-hover:-translate-y-0.5 [&_svg]:size-4.5">
                        <BookOpenText aria-hidden="true" className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1 py-0.5">
                        <span className="block text-sm font-medium leading-5 text-card-foreground sm:text-base sm:leading-6">
                            {t("actions.readTafsir")}
                        </span>
                        <span className="mt-0.5 block break-words text-xs leading-5 text-muted-foreground sm:text-sm">
                            {t("actions.readTafsirDescription")}
                        </span>
                    </span>
                </button>
                {isBookmarked && (
                    <button
                        type="button"
                        onClick={() => setIsCollectionsVisible(true)}
                        className="group flex w-full min-w-0 items-center gap-3.5 rounded-xl px-2 py-3 text-start transition-colors hover:bg-primary/6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-3 sm:py-3.5"
                    >
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/9 text-primary transition-[background-color,transform] duration-200 group-hover:bg-primary/15 motion-safe:group-hover:-translate-y-0.5 [&_svg]:size-4.5">
                            <FolderHeart aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1 py-0.5">
                            <span className="block text-sm font-medium leading-5 text-card-foreground sm:text-base sm:leading-6">
                                {t("actions.organizeBookmark")}
                            </span>
                            <span className="mt-0.5 block break-words text-xs leading-5 text-muted-foreground sm:text-sm">
                                {collectionIds.length > 0
                                    ? t("actions.inCollections", {
                                          count: collectionIds.length,
                                      })
                                    : t("actions.chooseCollections")}
                            </span>
                        </span>
                    </button>
                )}
                <button
                    type="button"
                    onClick={copyArabicText}
                    className="group flex w-full min-w-0 items-center gap-3.5 rounded-xl px-2 py-3 text-start transition-colors hover:bg-primary/6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-3 sm:py-3.5"
                >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/9 text-primary transition-[background-color,transform] duration-200 group-hover:bg-primary/15 motion-safe:group-hover:-translate-y-0.5 [&_svg]:size-4.5">
                        <Copy aria-hidden="true" className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1 py-0.5">
                        <span className="block text-sm font-medium leading-5 text-card-foreground sm:text-base sm:leading-6">
                            {t("actions.copyArabic")}
                        </span>
                        <span className="mt-0.5 block break-words text-xs leading-5 text-muted-foreground sm:text-sm">
                            {t("actions.copyArabicDescription")}
                        </span>
                    </span>
                </button>
                <button
                    type="button"
                    onClick={() => setIsShareVisible(true)}
                    className="group flex w-full min-w-0 items-center gap-3.5 rounded-xl px-2 py-3 text-start transition-colors hover:bg-primary/6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-3 sm:py-3.5"
                >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/9 text-primary transition-[background-color,transform] duration-200 group-hover:bg-primary/15 motion-safe:group-hover:-translate-y-0.5 [&_svg]:size-4.5">
                        <ImageDown aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1 py-0.5">
                        <span className="block text-sm font-medium leading-5 text-card-foreground sm:text-base sm:leading-6">
                            {t("actions.shareAyah")}
                        </span>
                        <span className="mt-0.5 block break-words text-xs leading-5 text-muted-foreground sm:text-sm">
                            {t("actions.shareAyahDescription")}
                        </span>
                    </span>
                </button>
                <button
                    type="button"
                    disabled={isSavingBookmark}
                    onClick={toggleBookmark}
                    aria-pressed={isBookmarked}
                    className="group flex w-full min-w-0 items-center gap-3.5 rounded-xl px-2 py-3 text-start transition-colors hover:bg-primary/6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-60 sm:px-3 sm:py-3.5"
                >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/9 text-primary transition-[background-color,transform] duration-200 group-hover:bg-primary/15 motion-safe:group-hover:-translate-y-0.5 [&_svg]:size-4.5">
                        {isSavingBookmark ? (
                            <LoaderCircle
                                aria-hidden="true"
                                className="size-4 animate-spin"
                            />
                        ) : (
                            <Bookmark
                                aria-hidden="true"
                                className={`size-4 ${isBookmarked ? "fill-current" : ""}`}
                            />
                        )}
                    </span>
                    <span className="min-w-0 flex-1 py-0.5">
                        <span className="block text-sm font-medium leading-5 text-card-foreground sm:text-base sm:leading-6">
                            {isBookmarked
                                ? t("actions.removeBookmark")
                                : t("actions.bookmarkAyah")}
                        </span>
                        <span className="mt-0.5 block break-words text-xs leading-5 text-muted-foreground sm:text-sm">
                            {isBookmarked
                                ? t("actions.savedCollection")
                                : t("actions.keepCollection")}
                        </span>
                    </span>
                </button>
                <button
                    type="button"
                    onClick={openReflection}
                    className="group flex w-full min-w-0 items-center gap-3.5 rounded-xl px-2 py-3 text-start transition-colors hover:bg-primary/6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-3 sm:py-3.5"
                >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/9 text-primary transition-[background-color,transform] duration-200 group-hover:bg-primary/15 motion-safe:group-hover:-translate-y-0.5 [&_svg]:size-4.5">
                        <NotebookPen aria-hidden="true" className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1 py-0.5">
                        <span className="block text-sm font-medium leading-5 text-card-foreground sm:text-base sm:leading-6">
                            {reflection
                                ? t("actions.editReflection")
                                : t("actions.addReflection")}
                        </span>
                        <span className="mt-0.5 block break-words text-xs leading-5 text-muted-foreground sm:text-sm">
                            {reflection
                                ? t("actions.returnPrivateNote")
                                : t("actions.writePrivateNote")}
                        </span>
                    </span>
                </button>
            </div>
        </div>
    );
}
