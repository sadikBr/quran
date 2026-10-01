"use client";

import {
    BookA,
    Bookmark,
    BookOpenText,
    Check,
    ChevronDown,
    Copy,
    FolderHeart,
    FolderPlus,
    History,
    ImageDown,
    Languages,
    Layers,
    Lightbulb,
    LoaderCircle,
    NotebookPen,
    Pause,
    Play,
    RefreshCcw,
    Repeat2,
    Tags,
    TextSearch,
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
import type { TajweedSegment } from "../helpers/quranpedia-tajweed";
import type { StudySection } from "../study-types";
import AyahActionsToolbar from "./ayah-actions-toolbar";
import AyahPracticePanel from "./ayah-practice-panel";
import AyahShareCard from "./ayah-share-card";
import AyahStudyPanel from "./ayah-study-panel";
import { useQuranAudio } from "./quran-audio-provider";
import QuranText, { getPlainQuranText } from "./quran-text";

function QuranAyahPreview({
    riwayah,
    tajweed,
    text,
    ayahNumber,
}: {
    text: string;
    tajweed?: TajweedSegment[];
    riwayah: "hafs" | "warsh";
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
        <figure className="my-4 min-w-0 rounded-2xl border border-border/60 bg-muted/20 px-4 py-3 sm:px-5">
            <figcaption className="sr-only">
                {t("actions.quranAyah", { number: ayahNumber })}
            </figcaption>
            <div className="relative">
                <p
                    ref={textRef}
                    data-arabic-edition={
                        riwayah === "warsh"
                            ? "quranpedia.mushaf.4"
                            : tajweed
                              ? "quranpedia.mushaf.11"
                              : undefined
                    }
                    dir="rtl"
                    lang="ar"
                    style={
                        isCollapsible && !isExpanded
                            ? {
                                  maskImage:
                                      "linear-gradient(to bottom, black 75%, transparent)",
                              }
                            : undefined
                    }
                    className={`ayah quran-display-text text-center leading-[2] text-foreground [overflow-wrap:anywhere] ${
                        isExpanded ? "" : "max-h-28 overflow-hidden sm:max-h-32"
                    }`}
                >
                    <QuranText text={text} tajweed={tajweed} />
                </p>
            </div>
            {isCollapsible && (
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-expanded={isExpanded}
                    onClick={() => setIsExpanded((expanded) => !expanded)}
                    className="mx-auto mt-2 flex min-h-10 text-xs text-primary"
                >
                    {isExpanded
                        ? t("actions.showLess")
                        : t("actions.showFullAyah")}
                    <ChevronDown
                        aria-hidden="true"
                        className={`size-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    />
                </Button>
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
    arabicTajweed?: TajweedSegment[];
    translationText: string;
    translationEditionName: string;
    studySections: StudySection[];
    studyReferences: number[];
    preferredTafsirBook: number;
    audioStreams: string[];
    audioNumber?: number;
    globalAyahNumber: number;
    surahNumber: number;
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
            <span className="surah-name block max-w-full text-[clamp(2rem,8vw,2.75rem)] font-normal leading-none tracking-normal text-foreground">
                {getArabicNumber(surahNumber)}
            </span>
        );
    }

    return <>{surahName}</>;
}

function VerseHeading({
    locale,
    surahNumber,
    surahName,
    ayahNumber,
}: {
    locale: string;
    surahNumber: number;
    surahName: string;
    ayahNumber: number;
}) {
    const t = useTranslations("Reader.actions");
    return (
        <header className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
            <h1
                id="ayah-actions-title"
                tabIndex={-1}
                className="min-w-0 break-words text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
            >
                <SurahTitle
                    locale={locale}
                    surahNumber={surahNumber}
                    surahName={surahName}
                />
            </h1>
            <span className="shrink-0 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
                {t("ayah", { number: ayahNumber })}
            </span>
        </header>
    );
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
                "app-card group grid min-h-24 w-full min-w-0 grid-cols-[2.5rem_minmax(0,1fr)] content-center items-center gap-x-3 p-4 text-start transition-colors hover:border-primary/30 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-60",
                pressed && "border-primary/25 bg-primary/8",
                className,
            )}
        >
            <span
                className={cn(
                    "row-span-2 flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/15 [&_svg]:size-5",
                    pressed && "bg-primary/15 text-primary",
                )}
            >
                {icon}
            </span>
            <span className="block min-w-0 break-words text-sm font-semibold leading-6 text-card-foreground">
                {title}
            </span>
            <span className="mt-1 block min-w-0 break-words text-xs leading-5 text-muted-foreground">
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
    arabicTajweed,
    translationText,
    translationEditionName,
    studySections,
    studyReferences,
    preferredTafsirBook,
    audioStreams,
    audioNumber,
    globalAyahNumber,
    surahNumber,
    canSaveAyah,
    initialBookmarked,
    initialReflection,
    initialCollections,
    initialCollectionIds,
    savedAyahMetadata,
    closeOnCopy = false,
    onSavedAyahChangeAction,
}: AyahActionsProps) {
    // A retry tap can land on an action as the streamed content appears.
    const readyAt = useRef(0);
    useEffect(() => {
        readyAt.current = performance.now();
    }, []);
    const router = useRouter();
    const t = useTranslations("Reader");
    const commonT = useTranslations("Common");
    const studyT = useTranslations("Reader.study");
    const locale = useLocale();
    const direction = locale === "ar" ? "rtl" : "ltr";
    const [studySection, setStudySection] = useState<StudySection | null>(null);
    const [isReflectionVisible, setIsReflectionVisible] = useState(false);
    const [isCollectionsVisible, setIsCollectionsVisible] = useState(false);
    const [isShareVisible, setIsShareVisible] = useState(false);
    const [isPracticeVisible, setIsPracticeVisible] = useState(false);
    const previousView = useRef("actions");
    const currentView = isShareVisible
        ? "share"
        : isCollectionsVisible
          ? "collections"
          : isReflectionVisible
            ? "reflection"
            : isPracticeVisible
              ? "practice"
              : (studySection ?? "actions");
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
    const [isSavingPractice, setIsSavingPractice] = useState(false);
    const {
        activeAyahNumber,
        isPlaying,
        playbackStatus,
        retryAudio,
        toggleAudio,
    } = useQuranAudio();
    const playbackAyahNumber = audioNumber ?? globalAyahNumber;
    const isCurrentAyah = activeAyahNumber === playbackAyahNumber;
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

    async function saveForPractice() {
        if (!canSaveAyah) {
            toast.error(t("actions.signInBookmarks"));
            return;
        }
        setIsSavingPractice(true);
        try {
            if (!isBookmarked) {
                const result = await updateBookmark({
                    ...savedAyahMetadata,
                    isBookmarked: true,
                });
                if (!result.success) {
                    toast.error(commonT("feedback.bookmarkUpdateFailed"));
                    return;
                }
                setIsBookmarked(true);
                onSavedAyahChangeAction?.();
            }
            await createCollection(
                t("actions.collectionSuggestions.memorization"),
            );
        } catch {
            toast.error(t("actions.collectionCreateFailed"));
        } finally {
            setIsSavingPractice(false);
        }
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
                <AyahActionsToolbar
                    title={t("actions.organizeBookmark")}
                    onBack={() => setIsCollectionsVisible(false)}
                />
                <header className="border-b border-border/60 pb-4">
                    <div className="flex items-center gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
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
                <AyahActionsToolbar
                    title={t("actions.privateReflection")}
                    onBack={() => setIsReflectionVisible(false)}
                />
                <VerseHeading
                    locale={locale}
                    surahNumber={surahNumber}
                    surahName={surahName}
                    ayahNumber={ayahNumber}
                />
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {t("actions.privateNote")}
                </p>

                <QuranAyahPreview
                    riwayah={riwayah}
                    text={arabicText}
                    tajweed={arabicTajweed}
                    ayahNumber={ayahNumber}
                />

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

    if (isPracticeVisible) {
        return (
            <div dir={direction} className="min-w-0 pb-1">
                <AyahActionsToolbar
                    title={t("practice.title")}
                    onBack={() => setIsPracticeVisible(false)}
                />
                <VerseHeading
                    locale={locale}
                    surahNumber={surahNumber}
                    surahName={surahName}
                    ayahNumber={ayahNumber}
                />
                <AyahPracticePanel
                    key={`${riwayah}:${playbackAyahNumber}:${audioStreams[0]}`}
                    number={playbackAyahNumber}
                    streams={audioStreams}
                    onSave={saveForPractice}
                    saving={isSavingPractice}
                    saved={collections.some(
                        (item) =>
                            item.name ===
                                t(
                                    "actions.collectionSuggestions.memorization",
                                ) && collectionIds.includes(item.id),
                    )}
                >
                    <QuranAyahPreview
                        text={arabicText}
                        tajweed={arabicTajweed}
                        riwayah={riwayah}
                        ayahNumber={ayahNumber}
                    />
                </AyahPracticePanel>
            </div>
        );
    }

    if (studySection) {
        return (
            <div dir={direction} className="min-w-0 pb-1">
                <AyahActionsToolbar
                    title={studyT(studySection)}
                    onBack={() => setStudySection(null)}
                />
                <VerseHeading
                    locale={locale}
                    surahNumber={surahNumber}
                    surahName={surahName}
                    ayahNumber={ayahNumber}
                />
                <QuranAyahPreview
                    text={arabicText}
                    tajweed={arabicTajweed}
                    riwayah={riwayah}
                    ayahNumber={ayahNumber}
                />
                <AyahStudyPanel
                    key={`${surahNumber}:${ayahNumber}:${riwayah}:${studySection}`}
                    section={studySection}
                    surahNumber={surahNumber}
                    ayahNumber={ayahNumber}
                    riwayah={riwayah}
                    references={studyReferences}
                    preferredBookId={
                        studySection === "tafsir"
                            ? preferredTafsirBook
                            : undefined
                    }
                />
            </div>
        );
    }

    return (
        <div
            dir={direction}
            className="min-w-0 pb-1"
            onClickCapture={(event) => {
                // Preserve keyboard/assistive activation (detail === 0).
                if (
                    event.detail > 0 &&
                    (event.detail > 1 ||
                        performance.now() - readyAt.current < 400)
                ) {
                    event.preventDefault();
                    event.stopPropagation();
                }
            }}
        >
            <AyahActionsToolbar title={t("actions.title")} />
            <VerseHeading
                locale={locale}
                surahNumber={surahNumber}
                surahName={surahName}
                ayahNumber={ayahNumber}
            />

            <QuranAyahPreview
                text={arabicText}
                tajweed={arabicTajweed}
                riwayah={riwayah}
                ayahNumber={ayahNumber}
            />
            <div className="min-w-0 pt-1 pb-1">
                <h2 className="mb-3 text-xs font-semibold text-muted-foreground">
                    {studyT("quickActions")}
                </h2>
                {audioStreams.length > 0 && (
                    <button
                        type="button"
                        disabled={isLoadingThisAyah}
                        onClick={() =>
                            hasPlaybackError
                                ? retryAudio()
                                : toggleAudio(playbackAyahNumber, audioStreams)
                        }
                        className="app-card w-full min-w-0 overflow-hidden border-primary/20 bg-primary/5 p-4 text-start text-foreground transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait"
                    >
                        <span className="flex items-center gap-4">
                            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
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
                                <span className="text-xs font-medium text-primary">
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
                </div>
                {studySections.length > 0 && (
                    <section className="mt-6 border-t border-border/60 pt-5">
                        <h2 className="mb-3 text-xs font-semibold text-muted-foreground">
                            {studyT("understandExplore")}
                        </h2>
                        <div className="grid gap-2.5 sm:grid-cols-2">
                            {studySections.map((section) => {
                                const Icon = {
                                    tafsir: BookOpenText,
                                    meanings: BookA,
                                    translations: Languages,
                                    asbab: History,
                                    similar: Layers,
                                    topics: Tags,
                                    e3rab: TextSearch,
                                    notes: Lightbulb,
                                }[section];
                                return (
                                    <ActionTile
                                        key={section}
                                        icon={<Icon aria-hidden="true" />}
                                        title={studyT(section)}
                                        description={studyT(
                                            `${section}Description`,
                                        )}
                                        onClick={() => setStudySection(section)}
                                    />
                                );
                            })}
                        </div>
                    </section>
                )}
                <h2 className="mt-6 mb-3 border-t border-border/60 pt-5 text-xs font-semibold text-muted-foreground">
                    {studyT("myCollection")}
                </h2>
                <div className="grid gap-2.5 sm:grid-cols-2">
                    {audioStreams.length > 0 && (
                        <ActionTile
                            icon={<Repeat2 aria-hidden="true" />}
                            title={t("practice.title")}
                            description={t("practice.tileDescription")}
                            onClick={() => setIsPracticeVisible(true)}
                            className="sm:col-span-2"
                        />
                    )}
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
                        className={isBookmarked ? "sm:col-span-2" : undefined}
                    />
                </div>
            </div>
        </div>
    );
}
