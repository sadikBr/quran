import { ArrowRight, Check, Sparkles, Trophy } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function MemorizationDashboardCard({
    completedHizbs,
    isArabic,
    labels,
}: {
    completedHizbs: number[];
    isArabic: boolean;
    labels: {
        eyebrow: string;
        title: string;
        description: string;
        open: string;
    };
}) {
    const completed = new Set(completedHizbs);
    const count = completed.size;
    const percentage = Math.round((count / 60) * 100);

    return (
        <Link
            href="/memorization"
            className="group flex min-h-64 flex-col justify-between bg-black/10 px-6 py-8 text-white outline-none transition-colors hover:bg-black/15 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/80 sm:px-10 lg:min-h-0 lg:px-8 lg:py-12"
        >
            <div className="flex min-w-0 items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-white">
                    {count === 60 ? (
                        <Trophy className="size-5" />
                    ) : (
                        <Sparkles className="size-5" />
                    )}
                </span>
                <div className="min-w-0">
                    <p className="text-xs font-semibold tracking-[0.16em] text-white/65 uppercase">
                        {labels.eyebrow}
                    </p>
                    <h2 className="mt-1 text-lg font-semibold tracking-tight">
                        {labels.title}
                    </h2>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/65 sm:text-sm">
                        {labels.description}
                    </p>
                    <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-white">
                        {labels.open}
                        <ArrowRight
                            className={cn(
                                "size-4 transition-transform group-hover:ltr:translate-x-1 group-hover:rtl:-translate-x-1",
                                isArabic && "rotate-180",
                            )}
                        />
                    </span>
                </div>
            </div>

            <div className="mt-8 flex items-end gap-4">
                <div
                    role="progressbar"
                    aria-label={labels.title}
                    aria-valuemin={0}
                    aria-valuemax={60}
                    aria-valuenow={count}
                    className="relative grid size-24 shrink-0 place-items-center"
                >
                    <svg
                        aria-hidden="true"
                        viewBox="0 0 100 100"
                        className="absolute inset-0 size-full -rotate-90"
                    >
                        <circle
                            cx="50"
                            cy="50"
                            r="43"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="5"
                            className="text-white/15"
                        />
                        <circle
                            cx="50"
                            cy="50"
                            r="43"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="5"
                            strokeLinecap="round"
                            pathLength="100"
                            strokeDasharray={`${percentage} 100`}
                            className="text-white/90"
                        />
                    </svg>
                    <div className="relative text-center" dir="ltr">
                        {count === 60 && (
                            <Check className="mx-auto mb-1 size-4 text-white" />
                        )}
                        <span className="text-2xl font-bold leading-none tabular-nums">
                            {count}
                        </span>
                        <span className="ms-1 text-xs font-semibold text-white/55 tabular-nums">
                            /60
                        </span>
                    </div>
                </div>
                <div className="mb-2 h-1 flex-1 overflow-hidden rounded-full bg-white/15">
                    <div
                        className="h-full rounded-full bg-white"
                        style={{ width: `${percentage}%` }}
                    />
                </div>
            </div>
        </Link>
    );
}
