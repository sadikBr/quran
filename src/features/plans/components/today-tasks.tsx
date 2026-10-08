"use client";

import {
    ArrowRight,
    BookOpen,
    CalendarDays,
    Check,
    ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect } from "react";
import { ADHKAR } from "@/features/adhkar/catalog";
import {
    type DailyChecklistState,
    type TodayTask,
    visibleTodayTasks,
} from "../daily-checklist";
import { todayActivityHref } from "../navigation";
import ChecklistCustomization from "./checklist-customization";
import ChecklistMark from "./checklist-mark";
import OccurrenceActions from "./occurrence-actions";

export type SurahOption = { number: number; name: string; englishName: string };

function ActivityLinks({ task }: { task: TodayTask }) {
    const t = useTranslations("Plans");
    const external = task.href?.startsWith("http");
    const actionClass =
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border/70 bg-background px-3 text-xs font-semibold text-foreground transition-colors hover:border-primary/30 hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
    return (
        <div className="flex max-w-[42%] shrink-0 flex-col items-end gap-1">
            {task.href &&
                (external ? (
                    <a
                        href={task.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={actionClass}
                    >
                        {t("openResource")}
                        <ExternalLink className="size-3.5" aria-hidden="true" />
                    </a>
                ) : (
                    <Link
                        href={todayActivityHref(task.href)}
                        className={actionClass}
                    >
                        {t(
                            task.submitted
                                ? "checklist.viewAssignment"
                                : task.done
                                  ? "open"
                                  : "checklist.start",
                        )}
                        <ArrowRight
                            className="size-3.5 rtl:rotate-180"
                            aria-hidden="true"
                        />
                    </Link>
                ))}
            {task.resourceHref && (
                <a
                    href={task.resourceHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={actionClass}
                >
                    {t("openResource")}
                    <ExternalLink className="size-3.5" aria-hidden="true" />
                </a>
            )}
            {task.recurring && (
                <OccurrenceActions occurrence={task.recurring} checklist />
            )}
        </div>
    );
}

export default function TodayTasks({
    tasks,
    checklist,
    surahs,
    compact = false,
}: {
    tasks: TodayTask[];
    checklist: DailyChecklistState;
    surahs: SurahOption[];
    compact?: boolean;
}) {
    const t = useTranslations("Plans");
    const kind = useTranslations("Planning.kinds");
    const locale = useLocale();
    const router = useRouter();
    useEffect(() => {
        const refresh = () => {
            if (document.visibilityState === "visible") router.refresh();
        };
        const timer = window.setInterval(refresh, 60_000);
        window.addEventListener("focus", refresh);
        document.addEventListener("visibilitychange", refresh);
        return () => {
            window.clearInterval(timer);
            window.removeEventListener("focus", refresh);
            document.removeEventListener("visibilitychange", refresh);
        };
    }, [router]);
    const name = (number: number) => {
        const surah = surahs.find((item) => item.number === number);
        return (locale === "ar" ? surah?.name : surah?.englishName) ?? number;
    };
    const title = (task: TodayTask) =>
        task.adhkar
            ? ADHKAR[task.adhkar.category][locale === "ar" ? "ar" : "en"]
            : (task.title ??
              task.ranges
                  .map(
                      (range) =>
                          `${name(range.startSurahNumber)} ${range.startAyahNumber} – ${range.startSurahNumber === range.endSurahNumber ? "" : `${name(range.endSurahNumber)} `}${range.endAyahNumber}`,
                  )
                  .join(" · "));
    const selected = visibleTodayTasks(tasks, checklist.settings);
    const visible = compact ? selected.slice(0, 4) : selected;
    const wird = visible.find((task) => task.kind === "wird");
    const activities = visible.filter((task) => task.kind !== "wird");
    const hidden = selected.length < tasks.length;
    const date = new Intl.DateTimeFormat(locale, {
        weekday: "long",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
    }).format(new Date(`${checklist.date}T12:00:00Z`));
    return (
        <section
            className={`space-y-5 ${compact ? "" : "mx-auto w-full max-w-5xl"}`}
            aria-label={t("today")}
        >
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <h2 className="text-xl font-semibold">{t("today")}</h2>
                        {!compact && (
                            <p className="text-xs text-muted-foreground">
                                {date}
                            </p>
                        )}
                    </div>
                    {!compact && (
                        <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                            {t("checklist.intro")}
                        </p>
                    )}
                </div>
                {compact ? (
                    <Link
                        href="/plans/today"
                        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary"
                    >
                        {t("viewAll")}
                        <ArrowRight
                            className="size-4 rtl:rotate-180"
                            aria-hidden="true"
                        />
                    </Link>
                ) : (
                    <ChecklistCustomization settings={checklist.settings} />
                )}
            </div>
            {!selected.length ? (
                <div className="app-card p-8 text-center">
                    <CalendarDays
                        className="mx-auto mb-3 size-8 text-primary"
                        aria-hidden="true"
                    />
                    <p className="font-semibold">
                        {t(hidden ? "checklist.hiddenEmpty" : "todayEmpty")}
                    </p>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">
                        {t(hidden ? "checklist.hiddenHint" : "todayEmptyHint")}
                    </p>
                    {(!hidden || compact) && (
                        <Link
                            href={hidden ? "/plans/today" : "/plans?create=1"}
                            className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-primary"
                        >
                            {t(hidden ? "today" : "create")}
                        </Link>
                    )}
                </div>
            ) : (
                <ul className="space-y-5" aria-label={t("checklist.label")}>
                    {wird && (
                        <li
                            className={`relative isolate overflow-hidden rounded-2xl bg-primary text-primary-foreground shadow-sm ${compact ? "p-5" : "p-5 sm:p-7"}`}
                        >
                            <div
                                className="pointer-events-none absolute -end-12 -top-16 size-64 rounded-full border-[32px] border-current opacity-[0.04]"
                                aria-hidden="true"
                            />
                            <div className="relative flex items-center gap-3">
                                <span className="flex size-10 items-center justify-center rounded-xl border border-current/15 bg-background/10">
                                    <BookOpen
                                        className="size-5"
                                        aria-hidden="true"
                                    />
                                </span>
                                <p className="text-sm font-semibold">
                                    {kind("wird")}
                                </p>
                                {wird.done && (
                                    <span className="ms-auto inline-flex items-center gap-1.5 rounded-full bg-background/15 px-2.5 py-1 text-xs font-medium">
                                        <Check
                                            className="size-3.5"
                                            aria-hidden="true"
                                        />
                                        {t("checklist.wirdCompleted")}
                                    </span>
                                )}
                            </div>
                            <div
                                className={`relative mt-5 flex flex-col items-start gap-5 ${compact ? "" : "sm:flex-row sm:items-end sm:justify-between sm:gap-8"}`}
                            >
                                <div className="min-w-0">
                                    <h3
                                        className={`font-semibold leading-relaxed ${compact ? "text-lg" : "text-xl sm:text-2xl"}`}
                                    >
                                        <bdi>{title(wird)}</bdi>
                                    </h3>
                                    <p className="mt-2 text-sm leading-7 opacity-80">
                                        {t(
                                            wird.done
                                                ? "checklist.wirdCompletedHint"
                                                : "checklist.wirdHint",
                                        )}
                                    </p>
                                </div>
                                <Link
                                    href={
                                        wird.done
                                            ? "/wird"
                                            : todayActivityHref(
                                                  wird.href || "/wird/read",
                                              )
                                    }
                                    className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-3 rounded-xl bg-background px-5 py-2.5 text-sm font-semibold text-foreground shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-foreground sm:w-auto"
                                >
                                    {t(
                                        wird.done
                                            ? "checklist.readingPlan"
                                            : "checklist.readWird",
                                    )}
                                    <ArrowRight
                                        className="size-4 rtl:rotate-180"
                                        aria-hidden="true"
                                    />
                                </Link>
                            </div>
                        </li>
                    )}
                    {activities.length > 0 && (
                        <li>
                            {!compact && (
                                <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
                                    {t("checklist.otherActivities")}
                                </h3>
                            )}
                            <ul
                                className={`grid gap-3 ${compact ? "" : "md:grid-cols-2"}`}
                            >
                                {activities.map((task) => (
                                    <li
                                        key={task.id}
                                        className="flex items-center gap-2 rounded-xl border border-border/65 bg-card p-3 sm:gap-3 sm:p-4"
                                    >
                                        <ChecklistMark
                                            task={task}
                                            name={title(task)}
                                        />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] leading-5 text-muted-foreground">
                                                <span>
                                                    {task.adhkar
                                                        ? t("checklist.adhkar")
                                                        : kind(task.kind)}
                                                </span>
                                                {task.done && (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/8 px-2 text-primary">
                                                        {t(
                                                            task.skipped
                                                                ? "skipped"
                                                                : task.submitted
                                                                  ? "checklist.submitted"
                                                                  : "completed",
                                                        )}
                                                    </span>
                                                )}
                                            </div>
                                            <h4 className="mt-0.5 break-words text-sm font-semibold leading-6">
                                                <bdi>{title(task)}</bdi>
                                            </h4>
                                            {task.notes && (
                                                <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-6 text-muted-foreground">
                                                    {task.notes}
                                                </p>
                                            )}
                                            {task.groupName && (
                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    {task.groupName}
                                                </p>
                                            )}
                                            {task.submitted && (
                                                <p className="mt-1 text-xs leading-6 text-muted-foreground">
                                                    {t(
                                                        "checklist.submittedHint",
                                                    )}
                                                </p>
                                            )}
                                        </div>
                                        {(task.href ||
                                            task.resourceHref ||
                                            task.recurring?.status ===
                                                "pending") && (
                                            <ActivityLinks task={task} />
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </li>
                    )}
                </ul>
            )}
            {!compact && (
                <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2 border-t border-border/60 pt-4 text-xs leading-6 text-muted-foreground">
                    <p className="max-w-2xl">{t("checklist.completionHint")}</p>
                    <Link
                        href="/plans"
                        className="inline-flex min-h-8 items-center gap-2 font-semibold text-primary"
                    >
                        {t("myPlans")}
                        <ArrowRight
                            className="size-3.5 rtl:rotate-180"
                            aria-hidden="true"
                        />
                    </Link>
                </div>
            )}
        </section>
    );
}
