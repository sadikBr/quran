"use client";

import { Check, LoaderCircle, Sparkles, Trophy } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import updateMemorizationProgress from "../server/update-memorization-progress";

export default function MemorizationProgressMap({
    initialCompletedHizbs,
}: {
    initialCompletedHizbs: number[];
}) {
    const t = useTranslations("Memorization");
    const [completedHizbs, setCompletedHizbs] = useState(
        () => new Set(initialCompletedHizbs),
    );
    const [pendingHizb, setPendingHizb] = useState<number | null>(null);
    const saveInFlight = useRef(false);
    const completedCount = completedHizbs.size;
    const percentage = Math.round((completedCount / 60) * 100);
    const nextHizb = useMemo(
        () =>
            Array.from({ length: 60 }, (_, index) => index + 1).find(
                (number) => !completedHizbs.has(number),
            ),
        [completedHizbs],
    );

    async function toggleHizb(hizbNumber: number) {
        if (saveInFlight.current) return;
        saveInFlight.current = true;

        const wasCompleted = completedHizbs.has(hizbNumber);
        const next = new Set(completedHizbs);
        if (wasCompleted) next.delete(hizbNumber);
        else next.add(hizbNumber);
        setCompletedHizbs(next);
        setPendingHizb(hizbNumber);

        try {
            const result = await updateMemorizationProgress({
                hizbNumber,
                completed: !wasCompleted,
            });
            if (!result.success) {
                setCompletedHizbs(completedHizbs);
                toast.error(t("updateFailed"));
                return;
            }
            toast.success(
                t(wasCompleted ? "markedInProgress" : "markedComplete", {
                    number: String(hizbNumber),
                }),
            );
        } catch {
            setCompletedHizbs(completedHizbs);
            toast.error(t("updateFailed"));
        } finally {
            saveInFlight.current = false;
            setPendingHizb(null);
        }
    }

    return (
        <div className="mt-6">
            <section className="rounded-2xl border border-primary/20 bg-card/80 p-4 shadow-sm sm:p-6">
                <div className="grid items-center gap-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-6">
                    <div
                        role="progressbar"
                        aria-label={t("progressEyebrow")}
                        aria-valuemin={0}
                        aria-valuemax={60}
                        aria-valuenow={completedCount}
                        className="relative mx-auto grid size-28 shrink-0 place-items-center rounded-full p-1.5 sm:size-32"
                        style={{
                            background: `conic-gradient(var(--primary) ${percentage}%, color-mix(in oklch, var(--muted), transparent 5%) 0)`,
                        }}
                    >
                        <div className="grid size-full place-items-center rounded-full bg-background/95 text-center shadow-inner">
                            <div>
                                {completedCount === 60 ? (
                                    <Trophy className="mx-auto mb-1 size-6 text-primary" />
                                ) : (
                                    <Sparkles className="mx-auto mb-1 size-5 text-primary" />
                                )}
                                <p
                                    dir="ltr"
                                    className="text-2xl font-bold tracking-tight"
                                >
                                    {completedCount}
                                    <span className="text-lg font-medium text-muted-foreground">
                                        /60
                                    </span>
                                </p>
                                <p className="mt-1 text-xs font-semibold text-primary">
                                    {percentage}%
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="text-center sm:text-start">
                        <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">
                            {t("progressEyebrow")}
                        </p>
                        <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">
                            {completedCount === 60
                                ? t("completeTitle")
                                : completedCount === 0
                                  ? t("startTitle")
                                  : t("progressTitle", {
                                        completed: completedCount,
                                    })}
                        </h2>
                        <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-muted-foreground md:mx-0">
                            {completedCount === 60
                                ? t("completeDescription")
                                : t("progressDescription", {
                                      remaining: 60 - completedCount,
                                  })}
                        </p>
                        {nextHizb && (
                            <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary/5 px-3 py-2 text-xs font-semibold text-primary">
                                <span className="size-2 rounded-full bg-primary" />
                                {t("nextHizb", {
                                    number: String(nextHizb),
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </section>

            <section className="mt-8" aria-labelledby="hizb-map-title">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">
                            {t("mapEyebrow")}
                        </p>
                        <h2
                            id="hizb-map-title"
                            className="mt-2 text-2xl font-semibold tracking-tight"
                        >
                            {t("mapTitle")}
                        </h2>
                    </div>
                    <p className="max-w-md text-sm leading-6 text-muted-foreground sm:text-end">
                        {t("mapDescription")}
                    </p>
                </div>

                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                    {t("personalRecord")}
                </p>
                <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-2">
                        <Check
                            aria-hidden="true"
                            className="size-4 text-primary"
                        />
                        {t("legendComplete")}
                    </span>
                    <span className="inline-flex items-center gap-2">
                        <span
                            aria-hidden="true"
                            className="size-4 rounded border border-border bg-muted/30"
                        />
                        {t("legendOpen")}
                    </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                    {Array.from({ length: 30 }, (_, index) => {
                        const juzNumber = index + 1;
                        const hizbs = [juzNumber * 2 - 1, juzNumber * 2];
                        const juzCompleted = hizbs.every((number) =>
                            completedHizbs.has(number),
                        );

                        return (
                            <article
                                key={juzNumber}
                                className={`rounded-2xl p-3 ring-1 transition-colors sm:p-4 ${
                                    juzCompleted
                                        ? "bg-primary/[0.09] ring-primary/20"
                                        : "bg-muted/30 ring-border/45"
                                }`}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <p
                                        className={`text-xs font-semibold ${
                                            juzCompleted
                                                ? "text-primary"
                                                : "text-muted-foreground"
                                        }`}
                                    >
                                        {t("juz", {
                                            number: String(juzNumber),
                                        })}
                                    </p>
                                    {juzCompleted && (
                                        <span className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                            <Check className="size-3" />
                                        </span>
                                    )}
                                </div>
                                <div className="mt-3 grid grid-cols-2 gap-2">
                                    {hizbs.map((hizbNumber) => {
                                        const completed =
                                            completedHizbs.has(hizbNumber);
                                        const pending =
                                            pendingHizb === hizbNumber;
                                        return (
                                            <button
                                                key={hizbNumber}
                                                type="button"
                                                disabled={pendingHizb !== null}
                                                aria-pressed={completed}
                                                aria-label={t(
                                                    completed
                                                        ? "reopenHizb"
                                                        : "completeHizb",
                                                    {
                                                        number: String(
                                                            hizbNumber,
                                                        ),
                                                    },
                                                )}
                                                onClick={() =>
                                                    toggleHizb(hizbNumber)
                                                }
                                                className={`flex min-h-14 flex-col items-center justify-center rounded-xl text-sm font-bold transition-[background-color,color,transform,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-65 ${
                                                    completed
                                                        ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20 hover:-translate-y-0.5"
                                                        : "bg-background/80 text-muted-foreground hover:-translate-y-0.5 hover:text-primary hover:shadow-sm"
                                                }`}
                                            >
                                                {pending ? (
                                                    <LoaderCircle className="size-4 animate-spin" />
                                                ) : completed ? (
                                                    <Check className="mb-0.5 size-4" />
                                                ) : null}
                                                <span>{hizbNumber}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </article>
                        );
                    })}
                </div>
            </section>
        </div>
    );
}
