import { ArrowRight, Check, MoonStar } from "lucide-react";
import Link from "next/link";
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
        <Link
            href="/wird"
            className="group relative flex min-h-48 flex-col justify-between overflow-hidden rounded-2xl bg-primary/[0.075] p-5 outline-none ring-1 ring-primary/15 transition-[background-color,box-shadow,transform] hover:-translate-y-0.5 hover:bg-primary/[0.095] hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring sm:p-6"
        >
            <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-16 -end-16 size-40 rounded-full bg-primary/[0.07] blur-3xl"
            />
            <div className="relative flex items-start justify-between gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/20">
                    {wird?.completed ? (
                        <Check aria-hidden="true" className="size-5" />
                    ) : (
                        <MoonStar aria-hidden="true" className="size-5" />
                    )}
                </span>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-[background-color,color,transform] group-hover:bg-primary/10 group-hover:text-primary group-hover:ltr:translate-x-0.5 group-hover:rtl:-translate-x-0.5">
                    <ArrowRight
                        aria-hidden="true"
                        className={cn("size-4", isArabic && "rotate-180")}
                    />
                </span>
            </div>
            <div className="relative mt-7 min-w-0">
                <p className="text-[0.7rem] font-semibold tracking-[0.14em] text-primary uppercase">
                    {labels.eyebrow}
                </p>
                <h3 className="mt-1.5 text-lg font-semibold tracking-tight">
                    {wird ? labels.goal : labels.emptyTitle}
                </h3>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                    {wird
                        ? wird.completed
                            ? labels.completed
                            : wird.scheduledForFuture
                              ? labels.restDay
                              : labels.pending
                        : labels.emptyDescription}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                    {history.currentStreak > 0 && (
                        <p className="text-xs font-medium text-primary">
                            {labels.streak}
                        </p>
                    )}
                    {khatmahProgress !== null && (
                        <p className="text-xs text-muted-foreground">
                            {labels.khatmahProgress}{" "}
                            <span className="font-semibold text-foreground tabular-nums">
                                {khatmahProgress}%
                            </span>
                        </p>
                    )}
                </div>
                {khatmahProgress !== null && (
                    <div
                        role="progressbar"
                        aria-label={labels.khatmahProgress}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={khatmahProgress}
                        className="mt-2 h-1 overflow-hidden rounded-full bg-primary/15"
                    >
                        <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${khatmahProgress}%` }}
                        />
                    </div>
                )}
            </div>
        </Link>
    );
}
