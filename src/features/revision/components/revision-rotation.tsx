"use client";

import { useTranslations } from "next-intl";
import {
    type PlanSurah,
    usePlanFormatting,
} from "@/features/learning/components/weekly-plan-ui";
import type { RevisionRotation } from "../rotation";

export default function RevisionRotationSummary({
    rotation,
    surahs,
    paused,
}: {
    rotation: RevisionRotation;
    surahs: PlanSurah[];
    paused: boolean;
}) {
    const t = useTranslations("Memorization.weekly");
    const { date, range } = usePlanFormatting(surahs);
    if (!rotation.totalAyahs) return null;
    return (
        <section
            className="space-y-4 rounded-3xl border border-primary/20 bg-primary/[0.03] p-5 sm:p-6"
            aria-labelledby="revision-rotation-title"
        >
            <div>
                <h2
                    id="revision-rotation-title"
                    className="text-lg font-semibold"
                >
                    {t("rotation.title")}
                </h2>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                    {t(
                        rotation.remainingAyahs > 0 && !rotation.weeks.length
                            ? "rotation.unscheduledSummary"
                            : "rotation.summary",
                        {
                            total: rotation.totalAyahs,
                            scheduled: rotation.scheduledAyahs,
                            remaining: rotation.remainingAyahs,
                        },
                    )}
                </p>
                <p className="mt-1 text-xs leading-6 text-muted-foreground">
                    {t("rotation.paceHint")}
                </p>
            </div>
            <details open={rotation.hizbs.length <= 12}>
                <summary className="cursor-pointer text-sm font-medium">
                    {t("rotation.coverage")}
                </summary>
                <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {rotation.hizbs.map((hizb) => (
                        <li
                            key={hizb.number}
                            className="rounded-xl border border-border/40 bg-background/40 p-3"
                        >
                            <p className="text-sm font-medium">
                                {t("rotation.hizb", { number: hizb.number })} ·{" "}
                                {t("ayahCount", { count: hizb.ayahs })}
                            </p>
                            <p className="mt-1 text-xs leading-6 text-muted-foreground">
                                {hizb.scheduledAyahs === hizb.ayahs
                                    ? t("rotation.inSchedule")
                                    : hizb.scheduledAyahs === 0
                                      ? t("rotation.queued")
                                      : t("rotation.inScheduleCount", {
                                            count: hizb.scheduledAyahs,
                                        })}
                            </p>
                            {hizb.nextDate && (
                                <p className="text-xs leading-6 text-primary">
                                    {t("rotation.followsFrom", {
                                        date: date(hizb.nextDate),
                                    })}
                                </p>
                            )}
                        </li>
                    ))}
                </ul>
            </details>
            {rotation.weeks.length > 0 ? (
                <details className="group border-t border-primary/15 pt-4">
                    <summary className="cursor-pointer text-sm font-medium text-primary">
                        {t("rotation.showWeeks", {
                            count: rotation.weeks.length,
                        })}
                    </summary>
                    <p className="my-3 text-xs leading-6 text-muted-foreground">
                        {t(
                            paused
                                ? "rotation.pausedHint"
                                : "rotation.forecastHint",
                        )}
                    </p>
                    <div className="space-y-3">
                        {rotation.weeks.map((week) => (
                            <details
                                key={week.weekStart}
                                className="rounded-xl border border-border/40 bg-background/30 p-4"
                            >
                                <summary className="cursor-pointer text-sm font-medium">
                                    {t("weekOf", {
                                        date: date(week.weekStart),
                                    })}{" "}
                                    ·{" "}
                                    {t("ayahCount", {
                                        count: week.sessions.reduce(
                                            (total, s) => total + s.ayahs,
                                            0,
                                        ),
                                    })}
                                </summary>
                                <ol className="mt-3 space-y-3">
                                    {week.sessions.map((session) => (
                                        <li
                                            key={session.ordinal}
                                            className="border-t border-border/30 pt-3"
                                        >
                                            <p className="text-xs text-muted-foreground">
                                                {date(session.scheduledDate)} ·{" "}
                                                {t("ayahCount", {
                                                    count: session.ayahs,
                                                })}
                                            </p>
                                            <p className="mt-1 text-sm leading-7">
                                                {range(session)}
                                            </p>
                                        </li>
                                    ))}
                                </ol>
                            </details>
                        ))}
                    </div>
                </details>
            ) : (
                rotation.remainingAyahs > 0 && (
                    <p className="text-sm leading-7 text-muted-foreground">
                        {t("rotation.chooseDays")}
                    </p>
                )
            )}
        </section>
    );
}
