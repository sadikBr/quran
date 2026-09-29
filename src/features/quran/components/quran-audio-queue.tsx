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
import { cn } from "@/lib/utils";
import type { QuranAudioQueueItem } from "./quran-audio-provider";
import { useQuranAudio } from "./quran-audio-provider";

export default function QuranAudioQueue({
    queue,
    continuousRecitation,
    showReadAll = false,
    scope = "page",
    className,
    embedded = false,
    subdued = false,
}: {
    queue: QuranAudioQueueItem[];
    continuousRecitation: boolean;
    showReadAll?: boolean;
    scope?: "page" | "surah" | "wird" | "practice";
    className?: string;
    embedded?: boolean;
    subdued?: boolean;
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
        scope === "surah"
            ? "audio.surahRecitation"
            : scope === "wird"
              ? "audio.wirdRecitation"
              : scope === "practice"
                ? "audio.practiceRecitation"
                : "audio.pageRecitation",
    );

    return (
        <fieldset
            aria-label={scopeLabel}
            className={cn(
                "relative flex w-fit shrink-0 items-center gap-1 overflow-hidden",
                embedded
                    ? "h-10 rounded-xl bg-transparent p-0 ps-1"
                    : "rounded-full bg-muted/55 p-1 ps-2",
                className,
                subdued &&
                    "h-auto rounded-xl border border-border/60 bg-muted/20 p-1",
            )}
        >
            {queueStatus !== "idle" && progress > 0 && (
                <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-0.5 origin-left rtl:origin-right bg-primary transition-transform duration-300 ease-linear"
                    style={{ transform: `scaleX(${progress})` }}
                />
            )}
            <span
                className={cn(
                    "flex items-center gap-1.5 px-1.5 text-muted-foreground text-xs",
                    subdued && "hidden lg:flex",
                )}
            >
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
                    className={cn(
                        "rounded-full text-muted-foreground hover:bg-primary/10 hover:text-primary pointer-coarse:size-10",
                        embedded ? "size-9" : "size-8",
                        subdued && "size-11 rounded-lg pointer-coarse:size-11",
                    )}
                    onClick={() => restartQueue(queue)}
                    aria-label={t("audio.restart", { scope: scopeLabel })}
                    title={t("audio.restart", { scope: scopeLabel })}
                >
                    <RotateCcw className="size-4" aria-hidden="true" />
                </Button>
                <Button
                    type="button"
                    size="sm"
                    variant={subdued ? "outline" : "default"}
                    disabled={isLoading}
                    className={cn(
                        "group rounded-full bg-primary px-3 text-primary-foreground shadow-[0_5px_16px_-8px_hsl(var(--primary))] hover:bg-primary/90 disabled:cursor-wait pointer-coarse:h-10 pointer-coarse:px-4",
                        embedded ? "h-9" : "h-8",
                        subdued &&
                            "h-11 rounded-lg border-border/70 bg-background px-3 text-foreground shadow-none hover:bg-accent hover:text-accent-foreground pointer-coarse:h-11 pointer-coarse:px-3",
                    )}
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
                    <span
                        className={cn(
                            "flex size-5 items-center justify-center rounded-full bg-primary-foreground/18 transition-transform group-hover:scale-110",
                            subdued && "bg-primary/10 text-primary",
                        )}
                    >
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
        </fieldset>
    );
}
