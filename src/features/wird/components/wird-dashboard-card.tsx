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
}: {
    wird: DailyWird | null;
    history: WirdHistoryStats;
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
    };
    isArabic: boolean;
}) {
    return (
        <section className="mt-10 bg-primary/[0.07] px-5 py-6 sm:px-7 sm:py-7">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-4">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
                        {wird?.completed ? (
                            <Check aria-hidden="true" className="size-5" />
                        ) : (
                            <MoonStar aria-hidden="true" className="size-5" />
                        )}
                    </span>
                    <div>
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
                                    : labels.pending
                                : labels.emptyDescription}
                        </p>
                        {history.currentStreak > 0 && (
                            <p className="mt-2 text-xs font-medium text-primary">
                                {labels.streak}
                            </p>
                        )}
                    </div>
                </div>
                <Button asChild className="shrink-0 self-start sm:self-auto">
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
