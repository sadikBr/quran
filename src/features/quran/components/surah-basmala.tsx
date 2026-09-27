"use client";

import { cn } from "@/lib/utils";
import { getBasmalaText } from "../helpers/basmala";
import type { AyahType } from "../types";
import Ayah from "./ayah";
import { useQuranAudio } from "./quran-audio-provider";

export default function SurahBasmala({
    surahNumber,
    fatihaAyah,
    playbackAyahNumber,
    highlightEnabled = true,
}: {
    surahNumber: number;
    fatihaAyah?: AyahType;
    playbackAyahNumber?: number;
    highlightEnabled?: boolean;
}) {
    const { activeAyahNumber, playbackStatus } = useQuranAudio();
    const isActiveBasmala =
        highlightEnabled &&
        playbackAyahNumber !== undefined &&
        activeAyahNumber === playbackAyahNumber &&
        playbackStatus !== "idle" &&
        playbackStatus !== "error";
    if (surahNumber === 9) return null;

    if (!fatihaAyah) {
        return (
            <div
                dir="rtl"
                lang="ar"
                className={cn(
                    "basmala quran-basmala-text -mb-4 flex items-center justify-center rounded-md leading-[1.45] text-foreground transition-[background-color,box-shadow] duration-500",
                    isActiveBasmala &&
                        "bg-primary/6 shadow-[inset_0_-1px_0_hsl(var(--primary)/0.45)] dark:bg-primary/9",
                )}
            >
                {getBasmalaText()}
            </div>
        );
    }

    return (
        <div
            dir="rtl"
            lang="ar"
            className={cn(
                "ayah text-center leading-[1.55] text-foreground",
                fatihaAyah ? "mt-3 mb-0" : "my-4 sm:my-5",
            )}
        >
            <Ayah
                ayah={fatihaAyah}
                surahNumber={surahNumber}
                highlightEnabled={highlightEnabled}
            />
        </div>
    );
}
