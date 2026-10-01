"use client";

import { cn } from "@/lib/utils";
import type { AyahType } from "../types";
import { useQuranAudio } from "./quran-audio-provider";
import TranslationAyahLink from "./translation-ayah-link";

export default function TranslationAyah({ ayah }: { ayah: AyahType }) {
    const { activeAyahNumber, playbackStatus } = useQuranAudio();
    const isActiveAyah =
        activeAyahNumber === ayah.number &&
        playbackStatus !== "idle" &&
        playbackStatus !== "error";

    return (
        <p
            className={cn(
                "grid grid-cols-[1.75rem_minmax(0,1fr)] gap-3 rounded-lg px-3 py-2.5 transition-[background-color,box-shadow] duration-500 hover:bg-muted/45",
                isActiveAyah &&
                    "bg-primary/[0.06] shadow-[inset_0_-1px_0_hsl(var(--primary)/0.4)] dark:bg-primary/[0.09]",
            )}
        >
            <TranslationAyahLink
                ayahNumber={ayah.number}
                numberInSurah={ayah.numberInSurah}
            />
            <span className="whitespace-pre-line">{ayah.text}</span>
        </p>
    );
}
