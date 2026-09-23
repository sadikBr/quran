"use client";

import { Pause, Play } from "lucide-react";
import { useRef, useState } from "react";
import { getArabicNumber } from "@/lib/arabic-numbers";
import { cn } from "@/lib/utils";
import type { AyahType } from "../types";

function hasAudio(ayah: AyahType) {
    return (
        ayah.audio !== undefined ||
        (ayah.audioSecondary !== undefined && ayah.audioSecondary.length > 0)
    );
}

function getAvailableStreams(ayah: AyahType) {
    const streams: string[] = [];

    if (ayah.audio !== undefined && ayah.audio.length > 0) {
        streams.push(ayah.audio);
    }

    if (ayah.audioSecondary !== undefined && ayah.audioSecondary.length > 0) {
        streams.push(...ayah.audioSecondary);
    }

    return streams;
}

export default function Ayah({ ayah }: { ayah: AyahType }) {
    return (
        <span className="ayah inline cursor-pointer rounded-sm text-3xl leading-[inherit] text-foreground transition-colors hover:bg-primary/10 dark:hover:bg-primary/15 sm:text-4xl">
            <span
                className={cn(
                    ayah.sajda &&
                        "text-primary underline decoration-primary/40 decoration-2 underline-offset-8",
                )}
            >
                {ayah.text}
            </span>{" "}
            <AyahPlayer ayah={ayah} />
            <span className="frame inline-block align-[0.08em] text-sidebar-accent">
                {getArabicNumber(ayah.numberInSurah)}
            </span>{" "}
        </span>
    );
}

function AyahPlayer({ ayah }: { ayah: AyahType }) {
    const streams = getAvailableStreams(ayah);
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    async function togglePlayback() {
        const audio = audioRef.current;

        if (!audio) return;

        if (audio.paused) {
            try {
                await audio.play();
            } catch {
                setIsPlaying(false);
            }
            return;
        }

        audio.pause();
    }

    if (!hasAudio(ayah)) return null;

    return (
        <>
            <button
                type="button"
                onClick={togglePlayback}
                className="inline-flex size-6 translate-y-[-0.05em] items-center justify-center rounded-full border border-primary/30 bg-primary/8 align-middle text-primary transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label={`${isPlaying ? "Pause" : "Play"} ayah ${ayah.numberInSurah}`}
            >
                {isPlaying ? (
                    <Pause className="size-3 fill-current" aria-hidden="true" />
                ) : (
                    <Play
                        className="ml-px size-3 fill-current"
                        aria-hidden="true"
                    />
                )}
            </button>{" "}
            {/* biome-ignore lint/a11y/useMediaCaption: The recitation is operated through the labelled play button. */}
            <audio
                ref={audioRef}
                className="hidden"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
            >
                {streams.map((stream) => (
                    <source key={stream} src={stream} type="audio/mpeg" />
                ))}
            </audio>
        </>
    );
}
