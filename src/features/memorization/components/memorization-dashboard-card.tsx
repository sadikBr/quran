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
            className="group relative mt-6 block overflow-hidden rounded-3xl bg-gradient-to-br from-primary/[0.12] via-primary/[0.065] to-muted/30 p-5 outline-none ring-1 ring-primary/15 transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-ring sm:p-7"
        >
            <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-24 -end-20 size-60 rounded-full bg-primary/10 blur-3xl"
            />
            <div className="relative grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_auto]">
                <div className="flex items-start gap-4">
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm shadow-primary/20">
                        {count === 60 ? (
                            <Trophy className="size-5" />
                        ) : (
                            <Sparkles className="size-5" />
                        )}
                    </span>
                    <div className="min-w-0">
                        <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">
                            {labels.eyebrow}
                        </p>
                        <h2 className="mt-1.5 text-xl font-semibold tracking-tight sm:text-2xl">
                            {labels.title}
                        </h2>
                        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                            {labels.description}
                        </p>
                        <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">
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

                <div className="flex items-center justify-center gap-5 md:justify-end">
                    <div className="hidden grid-cols-10 gap-1 sm:grid">
                        {Array.from({ length: 60 }, (_, index) => {
                            const hizbNumber = index + 1;
                            return (
                                <span
                                    key={hizbNumber}
                                    aria-hidden="true"
                                    className={`size-2 rounded-full ${
                                        completed.has(hizbNumber)
                                            ? "bg-primary"
                                            : "bg-foreground/10"
                                    }`}
                                />
                            );
                        })}
                    </div>
                    <div
                        className="relative grid size-24 shrink-0 place-items-center rounded-full p-2"
                        style={{
                            background: `conic-gradient(var(--primary) ${percentage}%, color-mix(in oklch, var(--muted), transparent 5%) 0)`,
                        }}
                    >
                        <div className="grid size-full place-items-center rounded-full bg-background/95 text-center shadow-inner">
                            <div>
                                {count === 60 && (
                                    <Check className="mx-auto size-4 text-primary" />
                                )}
                                <span className="block text-2xl font-bold leading-none">
                                    {count}
                                </span>
                                <span className="mt-1 block text-[0.65rem] font-semibold text-muted-foreground">
                                    / 60
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
}
