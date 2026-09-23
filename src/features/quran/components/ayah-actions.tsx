"use client";

import {
    ArrowLeft,
    Bookmark,
    BookOpenText,
    Copy,
    LoaderCircle,
    NotebookPen,
    Pause,
    Play,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import getTafsirAyah from "../server/get-tafsir-ayah";
import type { Edition } from "../types";
import { useQuranAudio } from "./quran-audio-provider";

const actions = [
    {
        icon: Bookmark,
        title: "Bookmark this ayah",
        description: "Save it to return to during a future reading session.",
    },
    {
        icon: NotebookPen,
        title: "Add a reflection",
        description: "Keep a personal note alongside your reading.",
    },
];

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
    tafsirEditions,
    canChooseTafsir,
    closeOnCopy = false,
}: {
    surahName: string;
    ayahNumber: number;
    arabicText: string;
    tafsirText: string;
    tafsirEditionName: string;
    tafsirEditionIdentifier: string;
    tafsirDirection: string;
    audioStreams: string[];
    globalAyahNumber: number;
    tafsirEditions: Edition[];
    canChooseTafsir: boolean;
    closeOnCopy?: boolean;
}) {
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
    const { activeAyahNumber, isPlaying, toggleAudio } = useQuranAudio();
    const isPlayingThisAyah =
        activeAyahNumber === globalAyahNumber && isPlaying;

    async function copyArabicText() {
        try {
            await navigator.clipboard.writeText(arabicText);
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
                <header className="mt-7 pr-9">
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
                    <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>Selected edition</span>
                        {canChooseTafsir ? (
                            <Select
                                value={selectedTafsirIdentifier}
                                onValueChange={changeTafsirEdition}
                                disabled={isChangingTafsir}
                            >
                                <SelectTrigger
                                    aria-label="Choose tafsir edition"
                                    size="sm"
                                    className="min-w-45 bg-muted/60 text-xs"
                                >
                                    <SelectValue placeholder="Choose tafsir edition" />
                                    {isChangingTafsir && (
                                        <LoaderCircle
                                            aria-hidden="true"
                                            className="size-3.5 animate-spin text-primary"
                                        />
                                    )}
                                </SelectTrigger>
                                <SelectContent>
                                    {tafsirEditions.map((edition) => (
                                        <SelectItem
                                            key={edition.identifier}
                                            value={edition.identifier}
                                        >
                                            {edition.englishName ||
                                                edition.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <span className="rounded-md bg-muted px-2 py-1 font-medium text-foreground">
                                {selectedTafsir.editionName}
                            </span>
                        )}
                    </div>
                </header>
                <figure className="mt-7 rounded-xl bg-muted/50 px-5 py-4 sm:px-6 sm:py-5">
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
                        {arabicText}
                    </p>
                </figure>
                <article
                    className="mt-8 transition-opacity"
                    aria-busy={isChangingTafsir}
                >
                    <p className="text-xs font-semibold tracking-[0.16em] text-primary">
                        TAFSIR
                    </p>
                    {isChangingTafsir && (
                        <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                            <LoaderCircle
                                aria-hidden="true"
                                className="size-3.5 animate-spin text-primary"
                            />
                            Loading tafsir…
                        </p>
                    )}
                    <p
                        dir={selectedTafsir.direction}
                        className={`mt-5 border-s-2 border-primary/60 py-1 pe-5 ps-5 text-card-foreground transition-opacity sm:pe-7 sm:ps-7 ${
                            selectedTafsir.direction === "rtl"
                                ? "font-(family-name:--font-tafsir) text-justify text-xl leading-loose sm:text-2xl sm:leading-[2.05]"
                                : "font-serif text-lg leading-9 sm:text-xl sm:leading-10"
                        } ${isChangingTafsir ? "opacity-35" : ""}`}
                    >
                        {selectedTafsir.text}
                    </p>
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

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {audioStreams.length > 0 && (
                    <button
                        type="button"
                        onClick={() =>
                            toggleAudio(globalAyahNumber, audioStreams)
                        }
                        className="relative overflow-hidden rounded-xl bg-primary p-5 text-left text-primary-foreground transition-transform hover:-translate-y-0.5 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:col-span-2"
                    >
                        <span className="absolute -top-8 -right-6 size-28 rounded-full bg-primary-foreground/10" />
                        <span className="relative flex items-center gap-4">
                            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-foreground/15 ring-1 ring-primary-foreground/20">
                                {isPlayingThisAyah ? (
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
                                    {isPlayingThisAyah
                                        ? "Pause recitation"
                                        : "Listen to ayah"}
                                </span>
                                <span className="mt-1 block text-sm text-primary-foreground/75">
                                    {isPlayingThisAyah
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
                    className="group rounded-xl border bg-card p-5 text-left transition-transform hover:-translate-y-0.5 hover:border-primary/40 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                    <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                        <BookOpenText aria-hidden="true" className="size-4" />
                    </span>
                    <span className="mt-5 block">
                        <span className="font-medium text-card-foreground">
                            Read tafsir
                        </span>
                        <span className="mt-1 block text-sm leading-5 text-muted-foreground">
                            Explore commentary from your selected tafsir
                            edition.
                        </span>
                    </span>
                </button>
                <button
                    type="button"
                    onClick={copyArabicText}
                    className="group rounded-xl border bg-card p-5 text-left transition-transform hover:-translate-y-0.5 hover:border-primary/40 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                    <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <Copy aria-hidden="true" className="size-4" />
                    </span>
                    <span className="mt-5 block">
                        <span className="font-medium text-card-foreground">
                            Copy Arabic text
                        </span>
                        <span className="mt-1 block text-sm leading-5 text-muted-foreground">
                            Copy the text from your selected Quran edition.
                        </span>
                    </span>
                </button>
            </div>

            <section className="mt-8 border-t border-primary/15 pt-5">
                <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground">
                    MORE TOOLS, COMING SOON
                </p>
                <div className="mt-3 divide-y border-y border-primary/10">
                    {actions.map(({ icon: Icon, title, description }) => (
                        <div
                            key={title}
                            className="flex items-center gap-4 py-4"
                        >
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                                <Icon aria-hidden="true" className="size-3.5" />
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-card-foreground">
                                    {title}
                                </p>
                                <p className="mt-0.5 text-sm leading-5 text-muted-foreground">
                                    {description}
                                </p>
                            </div>
                            <span className="text-xs font-medium text-muted-foreground">
                                Soon
                            </span>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
