"use client";

import type { ComponentProps, ReactNode } from "react";
import { getArabicNumber } from "@/lib/arabic-numbers";
import { cn } from "@/lib/utils";
import QuranAudioQueue from "./quran-audio-queue";

/** Shared presentation; callers own progress persistence and completion rules. */
export default function GuidedReader({
    percentage,
    title,
    progressLabel,
    progressSummary,
    queue,
    continuousRecitation,
    scope,
    controls,
    children,
}: {
    percentage: number;
    title: string;
    progressLabel: string;
    progressSummary: string;
    queue: ComponentProps<typeof QuranAudioQueue>["queue"];
    continuousRecitation: boolean;
    scope: "wird" | "practice";
    controls?: ReactNode;
    children: ReactNode;
}) {
    return (
        <div className="mx-auto w-full max-w-4xl px-3 pb-[max(5rem,env(safe-area-inset-bottom))] sm:px-5">
            <section className="sticky top-[calc(4rem+env(safe-area-inset-top))] z-20 -mx-3 border-border/45 border-y bg-background/92 px-3 shadow-[0_14px_32px_-30px_hsl(var(--foreground)/0.55)] backdrop-blur-xl sm:top-[calc(5rem+env(safe-area-inset-top))] sm:-mx-5 sm:px-5">
                <div className="flex min-h-16 items-center justify-between gap-2 py-2 sm:gap-3">
                    <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
                        <strong
                            className="shrink-0 text-lg font-semibold text-primary tabular-nums sm:text-xl"
                            dir="ltr"
                        >
                            {percentage}%
                        </strong>
                        <span className="h-7 w-px bg-border/60" />
                        <div className="min-w-0">
                            <p className="text-[0.68rem] font-semibold tracking-[0.12em] text-primary uppercase">
                                {title}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
                                {progressLabel}
                            </p>
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                        {controls}
                        {queue.length > 0 && (
                            <QuranAudioQueue
                                queue={queue}
                                continuousRecitation={continuousRecitation}
                                scope={scope}
                                showReadAll
                                subdued
                                embedded
                                className="shrink-0"
                            />
                        )}
                    </div>
                </div>
                <div
                    role="progressbar"
                    aria-label={progressSummary}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={percentage}
                    className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden bg-muted/70"
                >
                    <div
                        className="h-full bg-primary transition-[width] duration-500"
                        style={{ width: `${percentage}%` }}
                    />
                </div>
            </section>
            {children}
        </div>
    );
}

export function GuidedReaderSurah({
    number,
    name,
    children,
}: {
    number: number;
    name: string;
    children: ReactNode;
}) {
    return (
        <section>
            <div className="mb-6 flex items-center gap-4">
                <span className="h-px flex-1 bg-primary/20" />
                <div className="text-center">
                    <p
                        aria-hidden="true"
                        className="surah-name text-3xl leading-none text-primary"
                    >
                        {getArabicNumber(number)}
                    </p>
                    <h2 className="mt-1 text-sm font-semibold">{name}</h2>
                </div>
                <span className="h-px flex-1 bg-primary/20" />
            </div>
            {children}
        </section>
    );
}

export function GuidedReaderVerse({
    active,
    className,
    ...props
}: ComponentProps<"article"> & { active: boolean }) {
    return (
        <article
            {...props}
            className={cn(
                "relative overflow-hidden rounded-2xl px-4 py-5 transition-colors sm:px-6",
                active
                    ? "bg-primary/[0.07] ring-1 ring-primary/15"
                    : "bg-muted/25",
                className,
            )}
        />
    );
}
