"use client";

import { CalendarCheck, Check, Sparkles, Trophy } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import SectionHeading from "@/components/section-heading";
import type { KhatmahHistoryStats } from "../types";

export default function KhatmahMilestones({
    stats,
}: {
    stats: KhatmahHistoryStats;
}) {
    const locale = useLocale();
    const t = useTranslations("Khatmah.history");
    if (stats.recent.length === 0) return null;

    const dateFormatter = new Intl.DateTimeFormat(locale, {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
    });
    const latestFull = stats.recent.find((entry) => entry.fullKhatmah);

    return (
        <section className="mt-8" aria-labelledby="khatmah-history-title">
            <SectionHeading
                id="khatmah-history-title"
                title={t("title")}
                description={t("description")}
                icon={<Trophy />}
            />

            {latestFull && (
                <div className="app-card relative mt-5 overflow-hidden p-4 sm:p-5">
                    <Sparkles className="absolute -end-6 -top-6 size-32 opacity-10" />
                    <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="app-card flex items-center gap-4 p-4 sm:p-5">
                            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                <Trophy className="size-6" aria-hidden="true" />
                            </span>
                            <div>
                                <p className="text-xs font-semibold tracking-[0.14em] uppercase opacity-70">
                                    {t("latest")}
                                </p>
                                <p className="mt-1 text-xl font-semibold">
                                    {t("completedOn", {
                                        date: dateFormatter.format(
                                            new Date(
                                                `${latestFull.completedDate}T12:00:00Z`,
                                            ),
                                        ),
                                    })}
                                </p>
                            </div>
                        </div>
                        <p className="text-sm opacity-80">
                            {t("duration", {
                                count: latestFull.actualDays,
                            })}
                        </p>
                    </div>
                </div>
            )}

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <Stat
                    icon={Trophy}
                    value={stats.totalCompleted}
                    label={t("total")}
                />
                <Stat
                    icon={CalendarCheck}
                    value={stats.fastestDays ?? "—"}
                    label={t("fastest")}
                />
                <Stat
                    icon={Check}
                    value={stats.totalReadingDays}
                    label={t("readingDays")}
                />
            </div>

            <div className="app-card mt-5 p-4 sm:p-5">
                <h3 className="font-semibold">{t("timeline")}</h3>
                <div className="mt-4 divide-y divide-border/60 border-y border-border/60">
                    {stats.recent.map((entry) => (
                        <article
                            key={entry.id}
                            className="flex flex-wrap items-center justify-between gap-3 py-4"
                        >
                            <div className="flex min-w-0 items-center gap-3">
                                <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                    <Check
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                </span>
                                <div className="min-w-0">
                                    <p className="font-medium">
                                        {t(
                                            entry.fullKhatmah
                                                ? "fullEntry"
                                                : "partialEntry",
                                        )}
                                    </p>
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                        {t("entryDetails", {
                                            actual: entry.actualDays,
                                            planned: entry.plannedWeeks,
                                            reading: entry.readingDays,
                                        })}
                                    </p>
                                </div>
                            </div>
                            <time className="shrink-0 text-xs text-muted-foreground">
                                {dateFormatter.format(
                                    new Date(
                                        `${entry.completedDate}T12:00:00Z`,
                                    ),
                                )}
                            </time>
                        </article>
                    ))}
                </div>
                {stats.recent.some((entry) => !entry.fullKhatmah) && (
                    <p className="mt-3 text-xs leading-5 text-muted-foreground">
                        {t("partialNote")}
                    </p>
                )}
            </div>
        </section>
    );
}

function Stat({
    icon: Icon,
    value,
    label,
}: {
    icon: typeof Trophy;
    value: number | string;
    label: string;
}) {
    return (
        <article className="app-card flex items-center gap-4 p-4 sm:p-5">
            <Icon className="size-5 shrink-0 text-primary" aria-hidden="true" />
            <div>
                <p className="text-2xl font-semibold tabular-nums">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
            </div>
        </article>
    );
}
