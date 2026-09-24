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
}: {
    text: string;
    isLoading: boolean;
}) {
    const tafsirScrollRef = useRef<HTMLDivElement>(null);
    const [hasMoreTafsir, setHasMoreTafsir] = useState(false);

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
        <div className="relative mt-3 rounded-xl bg-muted/30 px-4 sm:px-5">
            <div
                ref={tafsirScrollRef}
                className="max-h-[min(42dvh,32rem)] overflow-y-auto"
            >
                <p
                    dir="rtl"
                    lang="ar"
                    className={`pt-5 pb-12 font-(family-name:--font-tafsir) text-justify text-lg leading-[2.05] text-card-foreground/90 transition-opacity sm:pt-6 sm:text-xl sm:leading-[2.15] ${
                        isLoading ? "opacity-35" : ""
                    }`}
                    style={{ textAlignLast: "right" }}
                >
                    {text}
                </p>
            </div>
            {hasMoreTafsir && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 flex h-16 items-end justify-center rounded-b-xl bg-linear-to-t from-muted via-muted/90 to-transparent pb-2">
                    <span className="flex items-center gap-1 text-[0.65rem] font-semibold tracking-[0.12em] text-primary">
                        Continue reading
                        <ChevronDown aria-hidden="true" className="size-3" />
                    </span>
                </div>
            )}
        </div>
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
    onSavedAyahChange?: () => void;
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
    onSavedAyahChange,
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
        onSavedAyahChange?.();
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
        onSavedAyahChange?.();
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
                <header className="mt-6 pr-9">
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
                    <p className="text-xs font-semibold tracking-[0.16em] text-primary">
                        TAFSIR
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                        <h1
                            id="ayah-actions-title"
                            className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
                        >
                            {surahName}
                        </h1>
                        <span className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary">
                            Ayah {ayahNumber}
                        </span>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-medium">Edition</span>
                        {canChooseTafsir ? (
                            <EditionCombobox
                                ariaLabel="Choose tafsir edition"
                                editions={tafsirEditions}
                                value={selectedTafsirIdentifier}
                                onValueChange={changeTafsirEdition}
                                disabled={isChangingTafsir}
                                placeholder="Search tafsir editions…"
                                className="min-w-45 bg-muted/60 text-xs"
                            />
                        ) : (
                            <span className="rounded-md bg-muted px-2 py-1 font-medium text-foreground">
                                {selectedTafsir.editionName}
                            </span>
                        )}
                    </div>
                </header>
                <figure className="mt-6 rounded-xl bg-muted/50 px-5 py-4 sm:px-6 sm:py-5">
                    <figcaption className="flex items-center justify-between gap-3 text-xs font-semibold tracking-[0.14em] text-primary">
                        <span>QURAN</span>
                        <span className="text-muted-foreground">
                            AYAH {ayahNumber}
                        </span>
                    </figcaption>
                    <p
                        dir="rtl"
                        className="ayah mt-3 text-center text-xl leading-loose text-foreground sm:text-2xl sm:leading-[2.1]"
                    >
                        <TajweedText text={arabicText} />
                    </p>
                </figure>
                <article
                    className="mt-7 transition-opacity"
                    aria-busy={isChangingTafsir}
                >
                    <div className="flex items-center gap-3">
                        <p className="text-xs font-semibold tracking-[0.16em] text-primary">
                            TAFSIR
                        </p>
                        <span
                            aria-hidden="true"
                            className="h-px flex-1 bg-primary/10"
                        />
                    </div>
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
                    />
                </article>
            </div>
        );
    }

    return (
        <div className="pb-1">
            <header className="border-b border-primary/15 pb-5 pr-8">
                <div className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                        <BookOpenText aria-hidden="true" className="size-4" />
                    </span>
                    <p className="text-xs font-semibold tracking-[0.16em] text-primary">
                        AYAH ACTIONS
                    </p>
                </div>
                <h1
                    id="ayah-actions-title"
                    className="mt-5 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
                >
                    {surahName}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Ayah {ayahNumber}
                </p>
            </header>

            <p className="mt-6 text-sm leading-6 text-muted-foreground">
                Choose how you would like to continue with this ayah.
            </p>

            <div className="mt-5 grid gap-1.5 sm:grid-cols-2 sm:gap-2">
                {audioStreams.length > 0 && (
                    <button
                        type="button"
                        disabled={isLoadingThisAyah}
                        onClick={() =>
                            hasPlaybackError
                                ? retryAudio()
                                : toggleAudio(globalAyahNumber, audioStreams)
                        }
                        className="rounded-xl bg-primary px-5 py-4 text-left text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-wait sm:col-span-2"
                    >
                        <span className="flex items-center gap-4">
                            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-foreground/15 ring-1 ring-primary-foreground/20">
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
                                <span className="text-xs font-semibold tracking-[0.14em] text-primary-foreground/70">
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
                                <span className="mt-1 block text-sm text-primary-foreground/75">
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
                    className="group flex items-start gap-3 rounded-lg p-4 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
                        <BookOpenText aria-hidden="true" className="size-4" />
                    </span>
                    <span className="block pt-0.5">
                        <span className="font-medium text-card-foreground">
                            Read tafsir
                        </span>
                        <span className="mt-1 block text-sm leading-5 text-muted-foreground">
                            Explore commentary for this ayah.
                        </span>
                    </span>
                </button>
                <button
                    type="button"
                    onClick={copyArabicText}
                    className="group flex items-start gap-3 rounded-lg p-4 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-accent">
                        <Copy aria-hidden="true" className="size-4" />
                    </span>
                    <span className="block pt-0.5">
                        <span className="font-medium text-card-foreground">
                            Copy Arabic text
                        </span>
                        <span className="mt-1 block text-sm leading-5 text-muted-foreground">
                            Copy Arabic from your selected Quran edition.
                        </span>
                    </span>
                </button>
                <button
                    type="button"
                    disabled={isSavingBookmark}
                    onClick={toggleBookmark}
                    aria-pressed={isBookmarked}
                    className="group flex items-start gap-3 rounded-lg p-4 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-wait"
                >
                    <span
                        className={`flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                            isBookmarked
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground group-hover:bg-accent"
                        }`}
                    >
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
                                ? "This ayah is saved to your dashboard."
                                : "Save it to return during a future reading session."}
                        </span>
                    </span>
                </button>
                <button
                    type="button"
                    onClick={openReflection}
                    className="group flex items-start gap-3 rounded-lg p-4 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                    <span
                        className={`flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                            reflection
                                ? "bg-primary/12 text-primary"
                                : "bg-muted text-muted-foreground group-hover:bg-accent"
                        }`}
                    >
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
                                ? "A private reflection is attached to this ayah."
                                : "Keep a private note alongside your reading."}
                        </span>
                    </span>
                </button>
            </div>
        </div>
    );
}
