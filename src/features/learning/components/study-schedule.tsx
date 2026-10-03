"use client";
import { CalendarDays, Check, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LearningSchedule } from "../schedule";
import { saveStudyDays } from "../server/actions";
export default function StudySchedule({
    schedule,
}: {
    schedule: LearningSchedule;
}) {
    const t = useTranslations("Memorization.learning"),
        days = useTranslations("Memorization.weekly"),
        router = useRouter();
    const [value, setValue] = useState(schedule),
        [pending, startTransition] = useTransition();
    useEffect(() => {
        setValue((current) =>
            current.revision === schedule.revision ? current : schedule,
        );
    }, [schedule]);
    const changed =
        value.revisionDays.join(",") !== schedule.revisionDays.join(",") ||
        value.memorizationDays.join(",") !==
            schedule.memorizationDays.join(",");
    return (
        <section
            id="study-schedule"
            aria-labelledby="study-schedule-title"
            className="mt-6 scroll-mt-24 overflow-hidden rounded-3xl border border-border/45 bg-card/50"
            aria-busy={pending}
        >
            <div className="flex items-start gap-3 border-b border-border/35 p-5 sm:px-6">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/[0.08] text-primary">
                    <CalendarDays className="size-5" aria-hidden="true" />
                </span>
                <div>
                    <h2 id="study-schedule-title" className="font-semibold">
                        {t("scheduleTitle")}
                    </h2>
                    <p className="mt-1 text-xs leading-6 text-muted-foreground">
                        {t("scheduleHint")}
                    </p>
                </div>
            </div>
            <div className="space-y-5 p-5 sm:p-6">
                {(["revisionDays", "memorizationDays"] as const).map(
                    (field) => (
                        <fieldset key={field} disabled={pending}>
                            <legend className="mb-3 text-sm font-medium">
                                {t(field)}
                            </legend>
                            <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                                {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                                    <label
                                        key={day}
                                        className="min-w-0 cursor-pointer"
                                    >
                                        <input
                                            type="checkbox"
                                            className="peer sr-only"
                                            checked={value[field].includes(day)}
                                            onChange={() =>
                                                setValue((v) => ({
                                                    ...v,
                                                    [field]: v[field].includes(
                                                        day,
                                                    )
                                                        ? v[field].filter(
                                                              (d) => d !== day,
                                                          )
                                                        : [
                                                              ...v[field],
                                                              day,
                                                          ].sort(
                                                              (a, b) => a - b,
                                                          ),
                                                }))
                                            }
                                        />
                                        <span
                                            className={cn(
                                                "flex min-h-14 flex-col items-center justify-center gap-2 rounded-xl border p-2 text-center text-xs transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-disabled:cursor-wait peer-disabled:opacity-60",
                                                value[field].includes(day)
                                                    ? "border-primary/40 bg-primary/10 text-primary"
                                                    : "border-border/40 text-muted-foreground",
                                            )}
                                        >
                                            {days(`day${day}`)}
                                            <span
                                                aria-hidden="true"
                                                className={cn(
                                                    "flex size-4 items-center justify-center rounded-full border",
                                                    value[field].includes(day)
                                                        ? "border-primary bg-primary text-primary-foreground"
                                                        : "border-border/80",
                                                )}
                                            >
                                                {value[field].includes(day) && (
                                                    <Check className="size-3" />
                                                )}
                                            </span>
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </fieldset>
                    ),
                )}
                <div className="flex flex-col gap-4 border-t border-border/35 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="max-w-2xl text-xs leading-6 text-muted-foreground">
                        {t("scheduleChanges")}
                    </p>
                    <Button
                        type="button"
                        className="min-h-11 shrink-0"
                        disabled={pending || !changed}
                        onClick={() =>
                            startTransition(async () => {
                                try {
                                    const result = await saveStudyDays(value);
                                    if (!result.success) {
                                        toast.error(
                                            t(
                                                result.reason === "stale"
                                                    ? "scheduleStale"
                                                    : "failed",
                                            ),
                                        );
                                        router.refresh();
                                    } else {
                                        toast.success(t("scheduleSaved"));
                                        router.refresh();
                                    }
                                } catch {
                                    toast.error(t("failed"));
                                }
                            })
                        }
                    >
                        {pending && (
                            <LoaderCircle
                                aria-hidden="true"
                                className="size-4 animate-spin"
                            />
                        )}
                        {t("saveDays")}
                    </Button>
                </div>
            </div>
        </section>
    );
}
