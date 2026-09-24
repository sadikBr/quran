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
}: {
    queue: QuranAudioQueueItem[];
    continuousRecitation: boolean;
    showReadAll?: boolean;
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
        <div className="flex items-center justify-between gap-4 rounded-xl bg-primary/[0.055] px-3 py-2.5 sm:px-4">
            <div className="flex items-center gap-2.5 text-muted-foreground text-sm">
                <span className="flex size-7 items-center justify-center rounded-full bg-primary/12 text-primary">
                    <AudioLines className="size-3.5" aria-hidden="true" />
                </span>
                <div>
                    <p className="font-medium text-foreground">
                        Audio recitation
                    </p>
                    <p className="text-xs">Listen to this page</p>
                </div>
            </div>
            <div className="flex items-center gap-1">
                <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-9 rounded-full text-muted-foreground hover:bg-primary/10 hover:text-primary"
                    onClick={() => restartQueue(queue)}
                    aria-label="Restart page recitation"
                >
                    <RotateCcw className="size-4" aria-hidden="true" />
                </Button>
                <Button
                    type="button"
                    size="sm"
                    className="group h-9 rounded-full bg-primary px-3.5 text-primary-foreground shadow-[0_5px_16px_-8px_hsl(var(--primary))] hover:bg-primary/90"
                    onClick={() => toggleQueue(queue)}
                    aria-label={
                        isPlaying ? "Pause page recitation" : "Read all ayahs"
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
