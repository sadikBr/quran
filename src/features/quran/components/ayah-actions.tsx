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
import { type ReactNode, useEffect, useRef, useState } from "react";
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
import { cn } from "@/lib/utils";
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
    const isRightToLeft = direction === "rtl";
    return (
        <section
            aria-label={t("actions.tafsirCommentary")}
            className="mt-4 rounded-xl border border-border/60 bg-card/50 p-4 sm:p-5"
        >
            <p
                dir={isRightToLeft ? "rtl" : "ltr"}
                lang={isRightToLeft ? "ar" : undefined}
                className={cn(
                    "whitespace-pre-line text-start text-card-foreground/90 transition-opacity",
                    isRightToLeft
                        ? "font-(family-name:--font-tafsir) text-lg leading-[2.05] sm:text-xl sm:leading-[2.15]"
                        : "font-serif text-base leading-8 sm:text-lg sm:leading-9",
                    isLoading && "opacity-35",
                )}
            >
                {text}
            </p>
        </section>
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
                    className="mx-auto mt-3 flex min-h-11 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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

function ActionTile({
    icon,
    title,
    description,
    onClick,
    disabled = false,
    pressed,
    className,
}: {
    icon: ReactNode;
    title: ReactNode;
    description: ReactNode;
    onClick: () => void;
    disabled?: boolean;
    pressed?: boolean;
    className?: string;
}) {
    return (
        <button
            type="button"
            disabled={disabled}
            aria-pressed={pressed}
            onClick={onClick}
            className={cn(
                "group grid min-h-24 w-full min-w-0 grid-cols-[2.25rem_minmax(0,1fr)] content-center items-center gap-x-3 rounded-xl border border-border/55 bg-card/50 p-3.5 text-start transition-colors hover:border-primary/25 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-60",
                pressed && "border-primary/25 bg-primary/8",
                className,
            )}
        >
            <span
                className={cn(
                    "row-span-2 flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-primary transition-colors group-hover:bg-primary/10 [&_svg]:size-4",
                    pressed && "bg-primary/15 text-primary",
                )}
            >
                {icon}
            </span>
            <span className="block min-w-0 text-sm font-semibold leading-6 text-card-foreground">
                {title}
            </span>
            <span className="mt-0.5 block min-w-0 text-xs leading-5 text-muted-foreground">
                {description}
            </span>
        </button>
    );
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
    const previousView = useRef("actions");
    const currentView = isShareVisible
        ? "share"
        : isCollectionsVisible
          ? "collections"
          : isReflectionVisible
            ? "reflection"
            : isTafsirVisible
              ? "tafsir"
              : "actions";
    useEffect(() => {
        if (previousView.current === currentView) return;
        previousView.current = currentView;
        const heading = document.getElementById("ayah-actions-title");
        heading?.focus({ preventScroll: true });
        heading?.closest("[data-ayah-actions-scroll]")?.scrollTo({ top: 0 });
    }, [currentView]);

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
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl px-2 pe-12 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    <ArrowLeft
                        aria-hidden="true"
                        className="size-4 rtl:rotate-180"
                    />
                    {t("actions.back")}
                </button>
                <header className="mt-4 border-b border-border/55 pb-4">
                    <div className="flex items-center gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-primary">
                            <FolderHeart
                                aria-hidden="true"
                                className="size-4"
                            />
                        </span>
                        <h1
                            id="ayah-actions-title"
                            tabIndex={-1}
                            className="text-lg font-semibold tracking-tight text-foreground sm:text-xl"
                        >
                            {t("actions.organizeBookmark")}
                        </h1>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                        {t("actions.organizeDescription")}
                    </p>
                </header>

                <div className="mt-4 space-y-2" aria-busy={isSavingCollections}>
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
                                        className="min-h-11 rounded-xl bg-background px-3 py-1.5 text-xs font-medium text-primary ring-1 ring-primary/15 transition-colors hover:bg-primary/8 disabled:opacity-50"
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
                                    className={`flex min-h-14 w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-start transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 ${
                                        selected
                                            ? "border-primary/25 bg-card/70 text-foreground"
                                            : "border-border/55 bg-card/50 text-foreground hover:bg-muted/40"
                                    }`}
                                >
                                    <span
                                        className={`flex size-7 shrink-0 items-center justify-center rounded-lg ${
                                            selected
                                                ? "bg-primary/15 text-primary"
                                                : "bg-muted/60 text-muted-foreground"
                                        }`}
                                    >
                                        {selected ? (
                                            <Check className="size-4" />
                                        ) : (
                                            <FolderHeart className="size-4" />
                                        )}
                                    </span>
                                    <span className="min-w-0 flex-1 break-words text-sm font-medium">
                                        {collection.name}
                                    </span>
                                </button>
                            );
                        })
                    )}
                </div>

                <form
                    className="mt-5 border-t border-border/55 pt-4"
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
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl px-2 pe-12 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    <ArrowLeft
                        aria-hidden="true"
                        className="size-4 rtl:rotate-180"
                    />
                    {t("actions.back")}
                </button>
                <header className="relative isolate mt-4 pe-9">
                    <p className="text-xs font-semibold tracking-[0.16em] text-primary">
                        {t("actions.privateReflection")}
                    </p>
                    <h1
                        id="ayah-actions-title"
                        tabIndex={-1}
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

                <QuranAyahPreview text={arabicText} ayahNumber={ayahNumber} />

                <label
                    htmlFor="ayah-reflection"
                    className="mt-6 block text-sm font-medium text-foreground"
                >
                    {t("actions.yourReflection")}
                </label>
                <Textarea
                    id="ayah-reflection"
                    dir="auto"
                    maxLength={4000}
                    value={reflectionDraft}
                    onChange={(event) =>
                        setReflectionDraft(event.target.value.slice(0, 4000))
                    }
                    placeholder={t("actions.reflectionPlaceholder")}
                    rows={7}
                    className="mt-2 min-h-40 resize-y rounded-xl bg-muted/35 text-start leading-6"
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
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl px-2 pe-12 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    <ArrowLeft
                        aria-hidden="true"
                        className="size-4 rtl:rotate-180"
                    />
                    {t("actions.back")}
                </button>
                <header className="mt-4 pe-9">
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
                            tabIndex={-1}
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
            <header className="relative min-w-0 border-border/55 border-b pb-5 pe-11 pt-1">
                <p className="text-[0.65rem] font-semibold tracking-[0.2em] text-primary">
                    {t("actions.title")}
                </p>
                <div className="mt-2 flex min-w-0 items-end justify-between gap-4">
                    <h1
                        id="ayah-actions-title"
                        tabIndex={-1}
                        className="min-w-0 text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-3xl"
                    >
                        <SurahTitle
                            locale={locale}
                            surahNumber={surahNumber}
                            surahName={surahName}
                        />
                    </h1>
                    <p className="mb-0.5 shrink-0 rounded-lg bg-muted/60 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                        {t("actions.ayah", { number: ayahNumber })}
                    </p>
                </div>
            </header>

            <div className="min-w-0 pt-4 pb-1">
                {audioStreams.length > 0 && (
                    <button
                        type="button"
                        disabled={isLoadingThisAyah}
                        onClick={() =>
                            hasPlaybackError
                                ? retryAudio()
                                : toggleAudio(globalAyahNumber, audioStreams)
                        }
                        className="w-full min-w-0 overflow-hidden rounded-xl border border-primary/20 bg-primary/5 p-4 text-start text-foreground transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait"
                    >
                        <span className="flex items-center gap-4">
                            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_8px_22px_-12px_hsl(var(--primary))]">
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
                <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                    <ActionTile
                        icon={<BookOpenText aria-hidden="true" />}
                        title={t("actions.readTafsir")}
                        description={t("actions.readTafsirDescription")}
                        onClick={() => setIsTafsirVisible(true)}
                    />
                    <ActionTile
                        icon={<Copy aria-hidden="true" />}
                        title={t("actions.copyArabic")}
                        description={t("actions.copyArabicDescription")}
                        onClick={copyArabicText}
                    />
                    <ActionTile
                        icon={<ImageDown aria-hidden="true" />}
                        title={t("actions.shareAyah")}
                        description={t("actions.shareAyahDescription")}
                        onClick={() => setIsShareVisible(true)}
                    />
                    <ActionTile
                        icon={
                            isSavingBookmark ? (
                                <LoaderCircle
                                    aria-hidden="true"
                                    className="animate-spin"
                                />
                            ) : (
                                <Bookmark
                                    aria-hidden="true"
                                    className={
                                        isBookmarked ? "fill-current" : ""
                                    }
                                />
                            )
                        }
                        title={
                            isBookmarked
                                ? t("actions.removeBookmark")
                                : t("actions.bookmarkAyah")
                        }
                        description={
                            isBookmarked
                                ? t("actions.savedCollection")
                                : t("actions.keepCollection")
                        }
                        disabled={isSavingBookmark}
                        pressed={isBookmarked}
                        onClick={toggleBookmark}
                    />
                    {isBookmarked && (
                        <ActionTile
                            icon={<FolderHeart aria-hidden="true" />}
                            title={t("actions.organizeBookmark")}
                            description={
                                collectionIds.length > 0
                                    ? t("actions.inCollections", {
                                          count: collectionIds.length,
                                      })
                                    : t("actions.chooseCollections")
                            }
                            onClick={() => setIsCollectionsVisible(true)}
                        />
                    )}
                    <ActionTile
                        icon={<NotebookPen aria-hidden="true" />}
                        title={
                            reflection
                                ? t("actions.editReflection")
                                : t("actions.addReflection")
                        }
                        description={
                            reflection
                                ? t("actions.returnPrivateNote")
                                : t("actions.writePrivateNote")
                        }
                        onClick={openReflection}
                        className={!isBookmarked ? "sm:col-span-2" : undefined}
                    />
                </div>
            </div>
        </div>
    );
}
