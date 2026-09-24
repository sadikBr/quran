"use client";

import { AudioLines, Pause, Play, RotateCcw } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import type { QuranAudioQueueItem } from "./quran-audio-provider";
import { useQuranAudio } from "./quran-audio-provider";

export default function QuranAudioQueue({
    queue,
    continuousRecitation,
    showReadAll = false,
    scope = "page",
    className,
}: {
    queue: QuranAudioQueueItem[];
    continuousRecitation: boolean;
    showReadAll?: boolean;
    scope?: "page" | "surah";
    className?: string;
}) {
    const { isQueuePlaying, restartQueue, setReaderQueue, toggleQueue } =
        useQuranAudio();

    useEffect(() => {
        setReaderQueue(queue, continuousRecitation);

        return () => setReaderQueue([], false);
    }, [continuousRecitation, queue, setReaderQueue]);

    if (!showReadAll || queue.length === 0) return null;

    const isPlaying = isQueuePlaying(queue);

    return (
        <div
            className={`ml-auto flex w-fit items-center gap-1 rounded-full bg-muted/55 p-1 pl-2 ${className ?? ""}`}
        >
            <span className="flex items-center gap-1.5 px-1.5 text-muted-foreground text-xs">
                <AudioLines
                    className="size-3.5 text-primary"
                    aria-hidden="true"
                />
                <span className="hidden sm:inline">
                    {scope === "surah" ? "Surah recitation" : "Page recitation"}
                </span>
            </span>
            <div className="flex items-center gap-0.5">
                <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-8 rounded-full text-muted-foreground hover:bg-primary/10 hover:text-primary"
                    onClick={() => restartQueue(queue)}
                    aria-label={`Restart ${scope} recitation`}
                >
                    <RotateCcw className="size-4" aria-hidden="true" />
                </Button>
                <Button
                    type="button"
                    size="sm"
                    className="group h-8 rounded-full bg-primary px-3 text-primary-foreground shadow-[0_5px_16px_-8px_hsl(var(--primary))] hover:bg-primary/90"
                    onClick={() => toggleQueue(queue)}
                    aria-label={
                        isPlaying
                            ? `Pause ${scope} recitation`
                            : "Read all ayahs"
                    }
                >
                    <span className="flex size-5 items-center justify-center rounded-full bg-primary-foreground/18 transition-transform group-hover:scale-110">
                        {isPlaying ? (
                            <Pause
                                className="size-2.5 fill-current"
                                aria-hidden="true"
                            />
                        ) : (
                            <Play
                                className="ml-px size-2.5 fill-current"
                                aria-hidden="true"
                            />
                        )}
                    </span>
                    <span>{isPlaying ? "Pause" : "Read all"}</span>
                </Button>
            </div>
        </div>
    );
}
