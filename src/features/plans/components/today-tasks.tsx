"use client";
import { ArrowRight, CalendarDays, Check, Circle } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import type { PlanningTask } from "@/features/planning/planner";
import { todayActivityHref } from "../navigation";
import OccurrenceActions from "./occurrence-actions";

export type SurahOption = { number: number; name: string; englishName: string };
export default function TodayTasks({
    tasks,
    surahs,
    compact = false,
}: {
    tasks: PlanningTask[];
    surahs: SurahOption[];
    compact?: boolean;
}) {
    const t = useTranslations("Plans"),
        kind = useTranslations("Planning.kinds"),
        locale = useLocale();
    const name = (n: number) => {
        const surah = surahs.find((s) => s.number === n);
        return (locale === "ar" ? surah?.name : surah?.englishName) ?? n;
    };
    const visible = compact ? tasks.slice(0, 4) : tasks;
    return (
        <section className="space-y-4" aria-label={t("today")}>
            {!compact && (
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="text-xl font-semibold">{t("today")}</h2>
                        <p className="mt-1 text-sm leading-7 text-muted-foreground">
                            {t("todayHint")}
                        </p>
                    </div>
                    <Link
                        href="/plans"
                        className="inline-flex min-h-11 items-center text-sm font-semibold text-primary"
                    >
                        {t("myPlans")}
                    </Link>
                </div>
            )}
            {compact && (
                <div className="flex items-center justify-between gap-3">
                    <h2 className="text-xl font-semibold">{t("today")}</h2>
                    <Link
                        href="/plans/today"
                        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary"
                    >
                        {t("viewAll")}
                        <ArrowRight className="size-4 rtl:rotate-180" />
                    </Link>
                </div>
            )}
            {tasks.length === 0 ? (
                <div className="app-card p-8 text-center">
                    <CalendarDays className="mx-auto mb-3 size-8 text-primary" />
                    <p className="font-semibold">{t("todayEmpty")}</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                        {t("todayEmptyHint")}
                    </p>
                    <Link
                        href="/plans?create=1"
                        className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-primary"
                    >
                        {t("create")}
                    </Link>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2">
                    {visible.map((task) => (
                        <article
                            key={task.id}
                            className="app-card flex min-w-0 flex-col gap-3 p-5"
                        >
                            <div className="flex items-center justify-between gap-2 text-xs font-semibold text-primary">
                                <span>{kind(task.kind)}</span>
                                {task.done ? (
                                    <span className="inline-flex items-center gap-1">
                                        <Check className="size-4" />
                                        {t(
                                            task.skipped
                                                ? "skipped"
                                                : "completed",
                                        )}
                                    </span>
                                ) : (
                                    <Circle className="size-3" />
                                )}
                            </div>
                            <h3 className="break-words font-semibold leading-7">
                                {task.title ??
                                    task.ranges
                                        .map(
                                            (range) =>
                                                `${name(range.startSurahNumber)} ${range.startAyahNumber} – ${range.startSurahNumber === range.endSurahNumber ? "" : `${name(range.endSurahNumber)} `}${range.endAyahNumber}`,
                                        )
                                        .join(" · ")}
                            </h3>
                            {task.notes && (
                                <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">
                                    {task.notes}
                                </p>
                            )}
                            {task.groupName && (
                                <p className="text-sm text-muted-foreground">
                                    {task.groupName}
                                </p>
                            )}
                            {task.recurring && (
                                <p className="text-xs text-muted-foreground">
                                    {task.skipped
                                        ? t("skipped")
                                        : t("minutes", {
                                              count: task.minutes,
                                          })}{" "}
                                    · {task.timezone}
                                </p>
                            )}
                            <div className="mt-auto flex flex-wrap items-center gap-3 pt-1">
                                {task.href &&
                                    (task.href.startsWith("http") ? (
                                        <a
                                            href={todayActivityHref(task.href)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary"
                                        >
                                            {t("openResource")}
                                            <ArrowRight className="size-4 rtl:rotate-180" />
                                        </a>
                                    ) : (
                                        <Link
                                            href={todayActivityHref(task.href)}
                                            className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary"
                                        >
                                            {t("open")}
                                            <ArrowRight className="size-4 rtl:rotate-180" />
                                        </Link>
                                    ))}
                                {task.resourceHref && (
                                    <a
                                        href={task.resourceHref}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex min-h-11 items-center text-sm font-semibold text-primary"
                                    >
                                        {t("openResource")}
                                    </a>
                                )}
                                {task.recurring && (
                                    <OccurrenceActions
                                        occurrence={task.recurring}
                                    />
                                )}
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </section>
    );
}
