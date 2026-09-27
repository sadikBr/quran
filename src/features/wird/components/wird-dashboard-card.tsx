import { ArrowRight, Check, MoonStar } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DailyWird, WirdHistoryStats } from "../types";

export default function WirdDashboardCard({
    wird,
    labels,
    isArabic,
    history,
    khatmahProgress,
}: {
    wird: DailyWird | null;
    history: WirdHistoryStats;
    khatmahProgress: number | null;
    labels: {
        eyebrow: string;
        emptyTitle: string;
        emptyDescription: string;
        setup: string;
        open: string;
        completed: string;
        pending: string;
        goal?: string;
        streak: string;
        restDay: string;
        khatmahProgress: string;
    };
    isArabic: boolean;
}) {
    return (
        <section className="relative mt-10 overflow-hidden rounded-3xl bg-gradient-to-br from-primary/[0.11] via-primary/[0.065] to-transparent px-5 py-6 ring-1 ring-primary/12 sm:px-7 sm:py-7">
            <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-20 -end-20 size-48 rounded-full bg-primary/[0.07] blur-3xl"
            />
            <div className="relative grid items-center gap-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-8">
                <div className="flex min-w-0 flex-col items-center gap-3 text-center sm:flex-row sm:items-start sm:gap-4 sm:text-start">
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary ring-1 ring-primary/15 sm:size-11 sm:rounded-full">
                        {wird?.completed ? (
                            <Check aria-hidden="true" className="size-5" />
                        ) : (
                            <MoonStar aria-hidden="true" className="size-5" />
                        )}
                    </span>
                    <div className="min-w-0 w-full sm:w-auto">
                        <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">
                            {labels.eyebrow}
                        </p>
                        <h2 className="mt-1.5 text-xl font-semibold tracking-tight sm:text-2xl">
                            {wird ? labels.goal : labels.emptyTitle}
                        </h2>
                        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                            {wird
                                ? wird.completed
                                    ? labels.completed
                                    : wird.scheduledForFuture
                                      ? labels.restDay
                                      : labels.pending
                                : labels.emptyDescription}
                        </p>
                        {history.currentStreak > 0 && (
                            <p className="mt-2 text-xs font-medium text-primary">
                                {labels.streak}
                            </p>
                        )}
                        {khatmahProgress !== null && (
                            <div className="mx-auto mt-4 w-full max-w-sm sm:mx-0">
                                <div className="flex items-center justify-between gap-4 text-xs">
                                    <span className="font-medium text-primary">
                                        {labels.khatmahProgress}
                                    </span>
                                    <span className="font-semibold tabular-nums">
                                        {khatmahProgress}%
                                    </span>
                                </div>
                                <div className="mt-2 h-1 overflow-hidden rounded-full bg-primary/15">
                                    <div
                                        className="h-full rounded-full bg-primary"
                                        style={{ width: `${khatmahProgress}%` }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <Button
                    asChild
                    className="min-h-11 w-full rounded-xl shadow-sm shadow-primary/15 sm:w-auto sm:shrink-0"
                >
                    <Link href="/wird">
                        {wird ? labels.open : labels.setup}
                        <ArrowRight
                            aria-hidden="true"
                            className={cn(isArabic && "rotate-180")}
                        />
                    </Link>
                </Button>
            </div>
        </section>
    );
}
