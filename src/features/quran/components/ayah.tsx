"use client";

import { Ellipsis, Pause, Play } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { getArabicNumber } from "@/lib/arabic-numbers";
import { cn } from "@/lib/utils";
import getAyahAudioStreams from "../helpers/get-ayah-audio-streams";
import type { AyahType } from "../types";
import { useQuranAudio } from "./quran-audio-provider";

export default function Ayah({
    ayah,
    surahNumber,
}: {
    ayah: AyahType;
    surahNumber: number;
}) {
    const ayahRef = useRef<HTMLSpanElement>(null);
    const { activeAyahNumber, isPlaying } = useQuranAudio();
    const isActiveAyah = activeAyahNumber === ayah.number && isPlaying;
    const actionsHref = `/quran/ayah/${surahNumber}/${ayah.numberInSurah}`;

    useEffect(() => {
        if (!isActiveAyah) return;

        ayahRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "nearest",
        });
    }, [isActiveAyah]);

    return (
        <span
            ref={ayahRef}
            id={`ayah-${ayah.number}`}
            className={cn(
                "ayah group/ayah me-[0.35em] inline scroll-mt-6 rounded-md text-3xl leading-[inherit] text-foreground transition-[color,box-shadow] duration-300 sm:text-4xl",
                isActiveAyah &&
                    "bg-primary/6 shadow-[inset_0_-1px_0_hsl(var(--primary)/0.4)] dark:bg-primary/9",
            )}
        >
            <span
                className={cn(
                    ayah.sajda &&
                        "text-primary underline decoration-primary/40 decoration-2 underline-offset-8",
                )}
            >
                {ayah.text}
            </span>{" "}
            <AyahPlayer ayah={ayah} />
            <span className="relative inline-block align-[0.08em]">
                <Link
                    href={actionsHref}
                    scroll={false}
                    className="frame relative inline-block rounded-sm text-sidebar-accent transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`Open actions for ayah ${ayah.numberInSurah}`}
                >
                    <span className="transition-opacity duration-300 ease-out sm:group-hover/ayah:opacity-0 sm:group-focus-within/ayah:opacity-0">
                        {getArabicNumber(ayah.numberInSurah)}
                    </span>
                    <span
                        aria-hidden="true"
                        className="pointer-events-none absolute top-[55%] left-1/2 flex size-6 -translate-x-1/2 -translate-y-1/2 scale-95 items-center justify-center rounded-full bg-primary/10 font-sans text-primary opacity-0 transition-[opacity,transform,background-color,color] duration-200 ease-out sm:group-hover/ayah:scale-100 sm:group-hover/ayah:opacity-100 sm:group-focus-within/ayah:scale-100 sm:group-focus-within/ayah:opacity-100"
                    >
                        <Ellipsis className="size-4" />
                    </span>
                </Link>
            </span>
        </span>
    );
}

function AyahPlayer({ ayah }: { ayah: AyahType }) {
    const streams = getAyahAudioStreams(ayah);
    const { activeAyahNumber, isPlaying, toggleAudio } = useQuranAudio();

    if (streams.length === 0) return null;

    const isPlayingThisAyah = activeAyahNumber === ayah.number && isPlaying;

    return (
        <>
            <button
                type="button"
                onClick={() => toggleAudio(ayah.number, streams)}
                className={cn(
                    "inline-flex size-6 translate-y-[-0.05em] items-center justify-center rounded-full border border-primary/30 bg-primary/8 align-middle text-primary transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    isPlayingThisAyah && "border-primary bg-primary/15",
                )}
                aria-label={`${isPlayingThisAyah ? "Pause" : "Play"} ayah ${ayah.numberInSurah}`}
            >
                {isPlayingThisAyah ? (
                    <Pause className="size-3 fill-current" aria-hidden="true" />
                ) : (
                    <Play
                        className="ml-px size-3 fill-current"
                        aria-hidden="true"
                    />
                )}
            </button>{" "}
        </>
    );
}
