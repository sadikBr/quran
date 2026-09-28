import { ArrowRight, Check, MoonStar } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { DailyWird, WirdHistoryStats } from "../types";

export default function WirdDashboardCard({
    step,
    wird,
    labels,
    isArabic,
    history,
    khatmahProgress,
}: {
    step: string;
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
            className="group relative grid min-w-0 grid-cols-[2.5rem_minmax(0,1fr)] items-start gap-3 rounded-xl py-4 outline-none after:pointer-events-none after:absolute after:top-[1.1rem] after:start-9 after:end-3 after:hidden after:h-px after:bg-border/70 focus-visible:ring-2 focus-visible:ring-ring min-[520px]:flex min-[520px]:min-h-52 min-[520px]:flex-col min-[520px]:items-start min-[520px]:gap-0 min-[520px]:px-3 min-[520px]:py-0 min-[520px]:after:block xl:after:hidden"
        >
            <span className="relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground ring-[6px] ring-background transition-transform group-hover:scale-105">
                {wird?.completed ? (
                    <Check aria-hidden="true" className="size-5" />
                ) : (
                    <MoonStar aria-hidden="true" className="size-5" />
                )}
            </span>
            <div className="min-w-0 min-[520px]:mt-5">
                <div className="flex items-center gap-2 text-[0.65rem] font-semibold tracking-[0.14em] uppercase">
                    <span className="text-muted-foreground tabular-nums">
                        {step}
                    </span>
                    <span
                        aria-hidden="true"
                        className="h-px w-4 bg-primary/40"
                    />
                    <p className="text-primary">{labels.eyebrow}</p>
                </div>
                <h3 className="mt-1.5 flex items-center gap-2 text-base font-semibold tracking-tight">
                    <span>{wird ? labels.goal : labels.emptyTitle}</span>
                    <ArrowRight
                        aria-hidden="true"
                        className={cn(
                            "size-4 shrink-0 text-muted-foreground transition-[color,transform] group-hover:text-primary group-hover:ltr:translate-x-1 group-hover:rtl:-translate-x-1",
                            isArabic && "rotate-180",
                        )}
                    />
                </h3>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                    {wird
                        ? wird.completed
                            ? labels.completed
                            : wird.scheduledForFuture
                              ? labels.restDay
                              : labels.pending
                        : labels.emptyDescription}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
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
                        className="mt-1.5 h-1 overflow-hidden rounded-full bg-primary/15"
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
