"use client";

import { CalendarCheck, Check, Flame, Trophy } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import SectionHeading from "@/components/section-heading";
import type { WirdHistoryStats, WirdUnit } from "../types";

const UNITS: WirdUnit[] = ["ayah", "page", "quarter", "hizb", "juz", "surah"];

export default function WirdHistory({ stats }: { stats: WirdHistoryStats }) {
    const locale = useLocale();
    const t = useTranslations("Wird.history");
    const unitT = useTranslations("Wird.units");
    const dayFormatter = new Intl.DateTimeFormat(locale, {
        weekday: "short",
        timeZone: "Africa/Casablanca",
    });
    const dateFormatter = new Intl.DateTimeFormat(locale, {
        day: "numeric",
        month: "short",
        timeZone: "Africa/Casablanca",
    });

    return (
        <section className="mt-8" aria-labelledby="wird-history-title">
            <SectionHeading
                id="wird-history-title"
                title={t("title")}
                description={t("description")}
                icon={<CalendarCheck />}
            />

            <div className="mt-5 grid gap-3 sm:grid-cols-3 ">
                <article className="app-card flex items-center gap-4 p-4 sm:p-5">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Flame aria-hidden="true" className="size-5" />
                    </span>
                    <div>
                        <p className="text-2xl font-semibold tabular-nums">
                            {stats.currentStreak}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {t("currentStreak")}
                        </p>
                    </div>
                </article>
                <article className="app-card flex items-center gap-4 p-4 sm:p-5">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                        <Trophy aria-hidden="true" className="size-5" />
                    </span>
                    <div>
                        <p className="text-2xl font-semibold tabular-nums">
                            {stats.longestStreak}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {t("longestStreak")}
                        </p>
                    </div>
                </article>
                <article className="app-card flex items-center gap-4 p-4 sm:p-5">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                        <CalendarCheck aria-hidden="true" className="size-5" />
                    </span>
                    <div>
                        <p className="text-2xl font-semibold tabular-nums">
                            {stats.totalCompleted}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {t("totalCompleted")}
                        </p>
                    </div>
                </article>
            </div>

            <div className="app-card mt-5 p-4 sm:p-5">
                <div className="flex items-center justify-between gap-4">
                    <h3 className="font-semibold">{t("lastSevenDays")}</h3>
                    <p className="text-xs text-muted-foreground">
                        {t("daysCompleted", {
                            count: stats.lastSevenDays.filter(
                                (day) => day.completed,
                            ).length,
                        })}
                    </p>
                </div>
                <div dir="ltr" className="mt-5 grid grid-cols-7 gap-1 sm:gap-2">
                    {stats.lastSevenDays.map((day) => {
                        const date = new Date(`${day.date}T12:00:00Z`);
                        return (
                            <div
                                key={day.date}
                                className="flex flex-col items-center gap-2"
                            >
                                <span className="text-[0.65rem] text-muted-foreground">
                                    {dayFormatter.format(date)}
                                </span>
                                <span
                                    className={`flex size-8 items-center justify-center rounded-lg sm:size-9 ${
                                        day.completed
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-background text-muted-foreground/35"
                                    }`}
                                    title={dateFormatter.format(date)}
                                >
                                    {day.completed ? (
                                        <Check
                                            aria-hidden="true"
                                            className="size-4"
                                        />
                                    ) : (
                                        <span className="size-1 rounded-full bg-current" />
                                    )}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {stats.totalCompleted > 0 && (
                <div className="app-card mt-5 grid gap-6 p-4 sm:p-5 md:grid-cols-[0.8fr_1.2fr]">
                    <div>
                        <h3 className="font-semibold">{t("totalsTitle")}</h3>
                        <dl className="mt-4 space-y-3">
                            {UNITS.filter((unit) => stats.totals[unit] > 0).map(
                                (unit) => (
                                    <div
                                        key={unit}
                                        className="flex items-center justify-between gap-4 text-sm"
                                    >
                                        <dt className="text-muted-foreground">
                                            {unitT(unit)}
                                        </dt>
                                        <dd className="font-semibold tabular-nums">
                                            {stats.totals[unit]}
                                        </dd>
                                    </div>
                                ),
                            )}
                        </dl>
                    </div>
                    <div>
                        <h3 className="font-semibold">{t("recentTitle")}</h3>
                        <div className="mt-4 space-y-3">
                            {stats.recent.slice(0, 5).map((entry) => (
                                <article
                                    key={entry.id}
                                    className="flex items-center justify-between gap-4 text-sm"
                                >
                                    <div>
                                        <p className="font-medium">
                                            {t("entry", {
                                                amount: entry.amount,
                                                unit: unitT(entry.unit),
                                            })}
                                        </p>
                                        {entry.carriedOver && (
                                            <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-400">
                                                {t("carriedOver")}
                                            </p>
                                        )}
                                    </div>
                                    <time
                                        dateTime={entry.completedDate}
                                        className="shrink-0 text-xs text-muted-foreground"
                                    >
                                        {dateFormatter.format(
                                            new Date(
                                                `${entry.completedDate}T12:00:00Z`,
                                            ),
                                        )}
                                    </time>
                                </article>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
