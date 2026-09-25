"use client";

import {
    ArrowLeft,
    Bookmark,
    BookOpenText,
    ChevronDown,
    Copy,
    LoaderCircle,
    NotebookPen,
    Pause,
    Play,
    RefreshCcw,
    Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    updateBookmark,
    updateReflection,
} from "@/features/saved-ayahs/server/update-saved-ayah";
import getTafsirAyah from "../server/get-tafsir-ayah";
import type { Edition } from "../types";
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
                aria-label="Tafsir commentary"
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
                    Continue reading
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
        <figure className="my-7 px-1">
            <figcaption className="sr-only">
                Quran, ayah {ayahNumber}
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
                    className={`ayah mt-3 text-center text-xl leading-loose text-foreground sm:text-2xl sm:leading-[2.1] ${
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
                    {isExpanded ? "Show less" : "Show full ayah"}
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
    ayahNumber: number;
    arabicText: string;
    tafsirText: string;
    tafsirEditionName: string;
    tafsirEditionIdentifier: string;
    tafsirDirection: string;
    audioStreams: string[];
    globalAyahNumber: number;
    surahNumber: number;
    pageNumber: number;
    tafsirEditions: Edition[];
    canChooseTafsir: boolean;
    canSaveAyah: boolean;
    initialBookmarked: boolean;
    initialReflection: string;
    plainArabicText: string;
    closeOnCopy?: boolean;
    onSavedAyahChangeAction?: () => void;
};

export default function AyahActions({
    surahName,
    ayahNumber,
    arabicText,
    tafsirText,
    tafsirEditionName,
    tafsirEditionIdentifier,
    tafsirDirection,
    audioStreams,
    globalAyahNumber,
    surahNumber,
    pageNumber,
    tafsirEditions,
    canChooseTafsir,
    canSaveAyah,
    initialBookmarked,
    initialReflection,
    plainArabicText,
    closeOnCopy = false,
    onSavedAyahChangeAction,
}: AyahActionsProps) {
    const router = useRouter();
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
    const [isBookmarked, setIsBookmarked] = useState(initialBookmarked);
    const [reflection, setReflection] = useState(initialReflection);
    const [reflectionDraft, setReflectionDraft] = useState(initialReflection);
    const [isSavingBookmark, setIsSavingBookmark] = useState(false);
    const [isSavingReflection, setIsSavingReflection] = useState(false);
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
    const savedAyahMetadata = {
        globalAyahNumber,
        surahNumber,
        ayahNumber,
        pageNumber,
        surahName,
        arabicText: plainArabicText,
    };

    async function copyArabicText() {
        try {
            await navigator.clipboard.writeText(getPlainQuranText(arabicText));
            toast.success("Arabic text copied");

            if (closeOnCopy) {
                router.back();
            }
        } catch {
            toast.error("Unable to copy the Arabic text");
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
                editionName: ayah.edition.englishName || ayah.edition.name,
                direction: ayah.edition.direction,
            });
        } catch {
            toast.error("We could not load that tafsir edition");
        } finally {
            setIsChangingTafsir(false);
        }
    }

    async function toggleBookmark() {
        if (!canSaveAyah) {
            toast.error("Sign in to save bookmarks.");
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
            toast.error(result.message);
            return;
        }

        toast.success(
            nextBookmarkedState ? "Ayah bookmarked" : "Bookmark removed",
        );
        onSavedAyahChangeAction?.();
    }

    function openReflection() {
        if (!canSaveAyah) {
            toast.error("Sign in to save private reflections.");
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
            toast.error(result.message);
            return;
        }

        const savedValue = value.trim();
        setReflection(savedValue);
        setReflectionDraft(savedValue);
        toast.success(savedValue ? "Reflection saved" : "Reflection removed");
        onSavedAyahChangeAction?.();
    }

    if (isReflectionVisible) {
        return (
            <div className="pb-1">
                <button
                    type="button"
                    onClick={() => setIsReflectionVisible(false)}
                    className="inline-flex items-center gap-2 rounded-md text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    <ArrowLeft aria-hidden="true" className="size-4" />
                    Ayah actions
                </button>
                <header className="relative isolate mt-7 pr-9">
                    <p className="text-xs font-semibold tracking-[0.16em] text-primary">
                        PRIVATE REFLECTION
                    </p>
                    <h1
                        id="ayah-actions-title"
                        className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
                    >
                        {surahName}, ayah {ayahNumber}
                    </h1>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        This note is private to your account.
                    </p>
                </header>

                <p
                    dir="rtl"
                    lang="ar"
                    className="ayah mt-6 rounded-xl bg-muted/45 px-5 py-4 text-center text-xl leading-loose text-foreground sm:text-2xl"
                >
                    <TajweedText text={arabicText} />
                </p>

                <label
                    htmlFor="ayah-reflection"
                    className="mt-6 block text-sm font-medium text-foreground"
                >
                    Your reflection
                </label>
                <Textarea
                    id="ayah-reflection"
                    value={reflectionDraft}
                    onChange={(event) =>
                        setReflectionDraft(event.target.value.slice(0, 4000))
                    }
                    placeholder="Write what this ayah brings to mind…"
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
                                Remove reflection
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
                        Save reflection
                    </Button>
                </div>
            </div>
        );
    }

    if (isTafsirVisible) {
        return (
            <div className="pb-1">
                <button
                    type="button"
                    onClick={() => setIsTafsirVisible(false)}
                    className="inline-flex items-center gap-2 rounded-md text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    <ArrowLeft aria-hidden="true" className="size-4" />
                    Ayah actions
                </button>
                <header className="mt-6 pr-9">
                    <div className="flex items-center gap-3">
                        <span
                            aria-hidden="true"
                            className="h-px w-6 bg-primary/70"
                        />
                        <p className="text-[0.65rem] font-semibold tracking-[0.22em] text-primary">
                            TAFSIR
                        </p>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                        <h1
                            id="ayah-actions-title"
                            className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
                        >
                            {surahName}
                        </h1>
                        <span className="text-sm text-muted-foreground">
                            Ayah {ayahNumber}
                        </span>
                    </div>
                </header>
                <QuranAyahPreview text={arabicText} ayahNumber={ayahNumber} />
                <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[0.65rem] font-semibold tracking-[0.18em] text-primary uppercase">
                        Commentary
                    </p>
                    <div className="min-w-0 max-w-full">
                        {canChooseTafsir ? (
                            <EditionCombobox
                                ariaLabel="Choose tafsir edition"
                                editions={tafsirEditions}
                                value={selectedTafsirIdentifier}
                                onValueChange={changeTafsirEdition}
                                disabled={isChangingTafsir}
                                placeholder="Search tafsir editions…"
                                className="w-full min-w-0 border-0 bg-transparent text-xs shadow-none sm:max-w-72"
                            />
                        ) : (
                            <span className="text-xs text-muted-foreground">
                                {selectedTafsir.editionName}
                            </span>
                        )}
                    </div>
                </div>
                <article
                    className="transition-opacity"
                    aria-busy={isChangingTafsir}
                >
                    {isChangingTafsir && (
                        <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                            <LoaderCircle
                                aria-hidden="true"
                                className="size-3.5 animate-spin text-primary"
                            />
                            Loading tafsir…
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
        <div className="pb-1">
            <header className="relative isolate overflow-hidden pb-8 pr-8 pt-3">
                <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-6 -top-10 -z-10 size-44 rounded-full bg-primary/8 blur-3xl"
                />
                <div className="flex items-center gap-3">
                    <span
                        aria-hidden="true"
                        className="h-px w-6 bg-primary/70"
                    />
                    <p className="text-[0.65rem] font-semibold tracking-[0.22em] text-primary">
                        AYAH ACTIONS
                    </p>
                </div>
                <h1
                    id="ayah-actions-title"
                    className="mt-5 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
                >
                    {surahName}
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    Ayah{" "}
                    <span className="font-medium text-foreground/80">
                        {ayahNumber}
                    </span>
                </p>
            </header>

            <div className="grid grid-cols-2 gap-x-5 gap-y-5 pb-3 sm:gap-x-8 sm:gap-y-6">
                {audioStreams.length > 0 && (
                    <button
                        type="button"
                        disabled={isLoadingThisAyah}
                        onClick={() =>
                            hasPlaybackError
                                ? retryAudio()
                                : toggleAudio(globalAyahNumber, audioStreams)
                        }
                        className="col-span-2 mb-1 rounded-xl bg-primary/8 px-4 py-4 text-left text-foreground transition-colors hover:bg-primary/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-wait"
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
                                    RECITATION
                                </span>
                                <span className="mt-1 block font-medium">
                                    {isLoadingThisAyah
                                        ? "Loading recitation"
                                        : hasPlaybackError
                                          ? "Retry recitation"
                                          : isPlayingThisAyah
                                            ? "Pause recitation"
                                            : "Listen to ayah"}
                                </span>
                                <span className="mt-1 block text-xs text-muted-foreground">
                                    {isLoadingThisAyah
                                        ? "Preparing your selected recitation."
                                        : hasPlaybackError
                                          ? "Playback failed. Tap to try again."
                                          : isPlayingThisAyah
                                            ? "Recitation is playing."
                                            : "Play this ayah using your selected recitation."}
                                </span>
                            </span>
                        </span>
                    </button>
                )}
                <button
                    type="button"
                    onClick={() => setIsTafsirVisible(true)}
                    className="group flex flex-col items-start gap-3 rounded-lg py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4"
                >
                    <span className="text-primary transition-transform duration-200 motion-safe:group-hover:-translate-y-1 [&_svg]:size-5">
                        <BookOpenText aria-hidden="true" className="size-4" />
                    </span>
                    <span className="block pt-0.5">
                        <span className="font-medium text-card-foreground">
                            Read tafsir
                        </span>
                        <span className="mt-1 block text-sm leading-5 text-muted-foreground">
                            Understand its meaning and context
                        </span>
                    </span>
                </button>
                <button
                    type="button"
                    onClick={copyArabicText}
                    className="group flex flex-col items-start gap-3 rounded-lg py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4"
                >
                    <span className="text-primary transition-transform duration-200 motion-safe:group-hover:-translate-y-1 [&_svg]:size-5">
                        <Copy aria-hidden="true" className="size-4" />
                    </span>
                    <span className="block pt-0.5">
                        <span className="font-medium text-card-foreground">
                            Copy Arabic text
                        </span>
                        <span className="mt-1 block text-sm leading-5 text-muted-foreground">
                            Copy from your selected edition
                        </span>
                    </span>
                </button>
                <button
                    type="button"
                    disabled={isSavingBookmark}
                    onClick={toggleBookmark}
                    aria-pressed={isBookmarked}
                    className="group flex flex-col items-start gap-3 rounded-lg py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 disabled:cursor-wait disabled:opacity-60"
                >
                    <span className="text-primary transition-transform duration-200 motion-safe:group-hover:-translate-y-1 [&_svg]:size-5">
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
                    <span className="block pt-0.5">
                        <span className="font-medium text-card-foreground">
                            {isBookmarked
                                ? "Remove bookmark"
                                : "Bookmark this ayah"}
                        </span>
                        <span className="mt-1 block text-sm leading-5 text-muted-foreground">
                            {isBookmarked
                                ? "Saved in your collection"
                                : "Keep this ayah in your collection"}
                        </span>
                    </span>
                </button>
                <button
                    type="button"
                    onClick={openReflection}
                    className="group flex flex-col items-start gap-3 rounded-lg py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4"
                >
                    <span className="text-primary transition-transform duration-200 motion-safe:group-hover:-translate-y-1 [&_svg]:size-5">
                        <NotebookPen aria-hidden="true" className="size-4" />
                    </span>
                    <span className="block pt-0.5">
                        <span className="font-medium text-card-foreground">
                            {reflection
                                ? "Edit reflection"
                                : "Add a reflection"}
                        </span>
                        <span className="mt-1 block text-sm leading-5 text-muted-foreground">
                            {reflection
                                ? "Return to your private note"
                                : "Write a private note about this ayah"}
                        </span>
                    </span>
                </button>
            </div>
        </div>
    );
}
