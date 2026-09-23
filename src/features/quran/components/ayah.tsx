"use client";

import { Pause, Play } from "lucide-react";
import Link from "next/link";
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
    return (
        <span className="ayah inline rounded-sm text-3xl leading-[inherit] text-foreground transition-colors hover:bg-primary/10 dark:hover:bg-primary/15 sm:text-4xl">
            <span
                className={cn(
                    ayah.sajda &&
                        "text-primary underline decoration-primary/40 decoration-2 underline-offset-8",
                )}
            >
                {ayah.text}
            </span>{" "}
            <AyahPlayer ayah={ayah} />
            <Link
                href={`/quran/ayah/${surahNumber}/${ayah.numberInSurah}`}
                scroll={false}
                className="frame inline-block rounded-sm align-[0.08em] text-sidebar-accent transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Open actions for ayah ${ayah.numberInSurah}`}
            >
                {getArabicNumber(ayah.numberInSurah)}
            </Link>{" "}
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
                className="inline-flex size-6 translate-y-[-0.05em] items-center justify-center rounded-full border border-primary/30 bg-primary/8 align-middle text-primary transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
