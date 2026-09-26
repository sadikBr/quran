"use client";

import {
    AudioLines,
    LoaderCircle,
    Pause,
    Play,
    RefreshCcw,
    RotateCcw,
} from "lucide-react";
import { useTranslations } from "next-intl";
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
    const t = useTranslations("Reader");
    const {
        getQueueStatus,
        isQueuePlaying,
        progress,
        restartQueue,
        retryAudio,
        setReaderQueue,
        toggleQueue,
    } = useQuranAudio();

    useEffect(() => {
        setReaderQueue(queue, continuousRecitation);

        return () => setReaderQueue([], false);
    }, [continuousRecitation, queue, setReaderQueue]);

    if (!showReadAll || queue.length === 0) return null;

    const isPlaying = isQueuePlaying(queue);
    const queueStatus = getQueueStatus(queue);
    const isLoading = queueStatus === "loading";
    const hasError = queueStatus === "error";
    const isPaused = queueStatus === "paused";
    const scopeLabel = t(
        scope === "surah" ? "audio.surahRecitation" : "audio.pageRecitation",
    );

    return (
        <div
            className={`relative flex w-fit items-center gap-1 overflow-hidden rounded-full bg-muted/55 p-1 ps-2 ${className ?? ""}`}
        >
            {queueStatus !== "idle" && progress > 0 && (
                <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-0.5 origin-left rtl:origin-right bg-primary transition-transform duration-300 ease-linear"
                    style={{ transform: `scaleX(${progress})` }}
                />
            )}
            <span className="flex items-center gap-1.5 px-1.5 text-muted-foreground text-xs">
                <AudioLines
                    className="size-3.5 text-primary"
                    aria-hidden="true"
                />
                <span className="hidden sm:inline">{scopeLabel}</span>
            </span>
            <div className="flex items-center gap-0.5">
                <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-8 rounded-full text-muted-foreground hover:bg-primary/10 hover:text-primary pointer-coarse:size-10"
                    onClick={() => restartQueue(queue)}
                    aria-label={t("audio.restart", { scope: scopeLabel })}
                >
                    <RotateCcw className="size-4" aria-hidden="true" />
                </Button>
                <Button
                    type="button"
                    size="sm"
                    disabled={isLoading}
                    className="group h-8 rounded-full bg-primary px-3 text-primary-foreground shadow-[0_5px_16px_-8px_hsl(var(--primary))] hover:bg-primary/90 disabled:cursor-wait pointer-coarse:h-10 pointer-coarse:px-4"
                    onClick={() =>
                        hasError ? retryAudio() : toggleQueue(queue)
                    }
                    aria-label={
                        hasError
                            ? t("audio.retry", { scope: scopeLabel })
                            : isLoading
                              ? t("audio.loading", { scope: scopeLabel })
                              : isPlaying
                                ? t("audio.pause", { scope: scopeLabel })
                                : isPaused
                                  ? t("audio.continue", { scope: scopeLabel })
                                  : t("audio.readAllAyahs")
                    }
                >
                    <span className="flex size-5 items-center justify-center rounded-full bg-primary-foreground/18 transition-transform group-hover:scale-110">
                        {isLoading ? (
                            <LoaderCircle
                                className="size-2.5 animate-spin"
                                aria-hidden="true"
                            />
                        ) : hasError ? (
                            <RefreshCcw
                                className="size-2.5"
                                aria-hidden="true"
                            />
                        ) : isPlaying ? (
                            <Pause
                                className="size-2.5 fill-current"
                                aria-hidden="true"
                            />
                        ) : (
                            <Play
                                className="ms-px size-2.5 fill-current"
                                aria-hidden="true"
                            />
                        )}
                    </span>
                    <span>
                        {isLoading
                            ? t("audio.loadingShort")
                            : hasError
                              ? t("audio.retryShort")
                              : isPlaying
                                ? t("audio.pauseShort")
                                : isPaused
                                  ? t("audio.continueShort")
                                  : t("audio.readAll")}
                    </span>
                </Button>
            </div>
        </div>
    );
}
