"use client";

import {
    AlertTriangle,
    ArrowLeft,
    ArrowRight,
    CalendarDays,
    Check,
    Clock3,
    Inbox,
    LoaderCircle,
    LockKeyhole,
    MoonStar,
    RotateCcw,
    Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import OccurrenceActions from "@/features/plans/components/occurrence-actions";
import { todayActivityHref } from "@/features/plans/navigation";
import { cn } from "@/lib/utils";
import {
    balanceWeek,
    dailyLoads,
    initialDraft,
    type PlanningTask,
    type PlanningView,
    validatePlacements,
    weekDates,
} from "../planner";
import { savePlanningWeek } from "../server/actions";
import MinutesInput from "./minutes-input";

function scrollToDay(
    board: HTMLElement | null,
    date: string,
    behavior: ScrollBehavior = "smooth",
) {
    const day = board?.querySelector<HTMLElement>(
        `[data-planning-date="${date}"]`,
    );
    if (!board || !day) return;
    const rtl = getComputedStyle(board).direction === "rtl";
    const edge = rtl ? "right" : "left";
    board.scrollTo({
        left:
            board.scrollLeft +
            day.getBoundingClientRect()[edge] -
            board.getBoundingClientRect()[edge],
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "instant"
            : behavior,
    });
}

export default function WeeklyPlanner({
    view,
    surahs,
}: {
    view: PlanningView;
    surahs: { number: number; name: string; englishName: string }[];
}) {
    const t = useTranslations("Planning");
    const plansT = useTranslations("Plans");
    const locale = useLocale();
    const router = useRouter();
    const [draft, setDraft] = useState(() => initialDraft(view));
    const [pending, startTransition] = useTransition();
    const [acknowledged, setAcknowledged] = useState(false);
    const [stale, setStale] = useState(false);
    const dates = weekDates(view.weekStart);
    const boardRef = useRef<HTMLElement>(null);
    const dirty = JSON.stringify(draft) !== JSON.stringify(initialDraft(view));
    const loads = dailyLoads(draft);
    const overloaded = loads.filter((day) => day.over > 0);
    const unplaced = draft.tasks.filter((task) => !task.date);
    const invalid = validatePlacements(view, draft);
    const number = (value: number) =>
        new Intl.NumberFormat(locale).format(value);
    const formatDate = (
        date: string,
        options: Intl.DateTimeFormatOptions = {
            month: "short",
            day: "numeric",
        },
    ) =>
        new Intl.DateTimeFormat(locale, { ...options, timeZone: "UTC" }).format(
            new Date(`${date}T12:00:00Z`),
        );
    const dayName = (date: string) => formatDate(date, { weekday: "short" });
    const range = (task: PlanningTask) =>
        task.title ??
        task.ranges
            .map((item) => {
                const name = (n: number) => {
                    const s = surahs.find((surah) => surah.number === n);
                    return (
                        (locale === "ar" ? s?.name : s?.englishName) ??
                        number(n)
                    );
                };
                return `${name(item.startSurahNumber)} ${number(item.startAyahNumber)} – ${item.startSurahNumber === item.endSurahNumber ? "" : `${name(item.endSurahNumber)} `}${number(item.endAyahNumber)}`;
            })
            .join(locale === "ar" ? "، " : "; ");
    const shiftWeek = (amount: number) => {
        const date = new Date(`${view.weekStart}T12:00:00Z`);
        date.setUTCDate(date.getUTCDate() + amount * 7);
        return date.toISOString().slice(0, 10);
    };
    const currentMonday = new Date(`${view.today}T00:00:00Z`);
    currentMonday.setUTCDate(
        currentMonday.getUTCDate() - ((currentMonday.getUTCDay() + 6) % 7),
    );
    const weekOffset = Math.round(
        (Date.parse(view.weekStart) - currentMonday.getTime()) / 604800000,
    );

    useEffect(() => {
        if (!dirty) return;
        const warn = (event: BeforeUnloadEvent) => {
            event.preventDefault();
        };
        window.addEventListener("beforeunload", warn);
        return () => window.removeEventListener("beforeunload", warn);
    }, [dirty]);

    useEffect(() => {
        scrollToDay(boardRef.current, view.today, "instant");
    }, [view.today]);

    function updateTask(
        id: string,
        change: { date?: string | null; minutes?: number },
    ) {
        setAcknowledged(false);
        if (change.date) scrollToDay(boardRef.current, change.date);
        setDraft((current) => ({
            ...current,
            tasks: current.tasks.map((task) =>
                task.id === id ? { ...task, ...change } : task,
            ),
        }));
    }

    function taskCard(task: PlanningTask) {
        const placed = draft.tasks.find((item) => item.id === task.id);
        if (!placed) return null;
        const moved = placed.date !== task.date;
        return (
            <article
                key={task.id}
                className={cn(
                    "min-w-0 rounded-xl border bg-card p-4 shadow-xs",
                    moved
                        ? "border-primary/50 ring-1 ring-primary/10"
                        : "border-border/50",
                    task.done && "opacity-70",
                )}
            >
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <span
                        className={cn(
                            "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold",
                            task.kind === "revision"
                                ? "bg-division/10 text-division"
                                : task.kind === "circle"
                                  ? "bg-accent text-accent-foreground"
                                  : "bg-primary/10 text-primary",
                        )}
                    >
                        {task.kind === "wird" ? (
                            <MoonStar className="size-3.5" aria-hidden="true" />
                        ) : (
                            <span
                                className="size-1.5 rounded-full bg-current"
                                aria-hidden="true"
                            />
                        )}
                        {t(`kinds.${task.kind}`)}
                    </span>
                    {task.done ? (
                        <Check
                            className="size-3.5 text-primary"
                            aria-label={t(task.skipped ? "skipped" : "done")}
                        />
                    ) : task.kind === "wird" ? (
                        <CalendarDays
                            className="size-3.5 text-muted-foreground"
                            aria-label={t("dailyRoutine")}
                        />
                    ) : !task.movable ? (
                        <LockKeyhole
                            className="size-3 text-muted-foreground"
                            aria-label={t("fixed")}
                        />
                    ) : moved ? (
                        <span className="text-[10px] font-medium text-primary">
                            {t("moved")}
                        </span>
                    ) : null}
                </div>
                <h3 className="mt-3 break-words text-sm font-semibold leading-7">
                    {range(task)}
                </h3>
                {task.kind === "wird" && !task.done && (
                    <p className="mt-1 text-xs leading-6 text-muted-foreground">
                        {task.wirdProjected
                            ? t("wirdForecast")
                            : t("dailyRoutine")}
                    </p>
                )}
                {task.groupName && (
                    <p className="mt-1 break-words text-[11px] text-muted-foreground">
                        {task.groupName}
                    </p>
                )}
                {task.deadline && (
                    <p className="mt-2 text-[11px] leading-5 text-division">
                        {t("due", { date: formatDate(task.deadline) })}
                    </p>
                )}
                {task.timezone !== view.timezone && (
                    <p className="mt-1 break-words text-[10px] text-muted-foreground">
                        {task.timezone}
                    </p>
                )}
                {task.movable || task.estimateEditable ? (
                    <div className="mt-3 space-y-2 border-t border-border/35 pt-3">
                        <label
                            htmlFor={`estimate-${task.id}`}
                            className="flex items-center justify-between gap-3 text-xs text-muted-foreground"
                        >
                            {t("estimate")}
                            <MinutesInput
                                id={`estimate-${task.id}`}
                                aria-label={t("estimateFor", {
                                    task: range(task),
                                })}
                                type="number"
                                min={5}
                                max={480}
                                step={5}
                                value={placed.minutes}
                                onChange={(minutes) =>
                                    updateTask(task.id, { minutes })
                                }
                                className="h-9 w-20 shrink-0 px-2 text-center text-sm"
                            />
                        </label>
                        {task.movable && (
                            <select
                                aria-label={t("moveFor", { task: range(task) })}
                                value={placed.date ?? ""}
                                onChange={(event) =>
                                    updateTask(task.id, {
                                        date: event.target.value || null,
                                    })
                                }
                                className="min-h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                {task.sequence === null &&
                                    (!task.deadline || task.date === null) && (
                                        <option value="">
                                            {t("unscheduled")}
                                        </option>
                                    )}
                                {dates.map((date) => (
                                    <option
                                        key={date}
                                        value={date}
                                        disabled={
                                            date < task.minDate ||
                                            date > task.maxDate
                                        }
                                    >
                                        {dayName(date)} · {formatDate(date)}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                ) : (
                    <p className="mt-3 text-[11px] text-muted-foreground">
                        {task.done
                            ? t(task.skipped ? "skipped" : "done")
                            : t("fixed")}{" "}
                        · {t("minutes", { count: placed.minutes })}
                    </p>
                )}
                {task.recurring && (
                    <div className="mt-3">
                        <OccurrenceActions
                            occurrence={task.recurring}
                            disabled={dirty || pending}
                        />
                    </div>
                )}
                {task.href && (
                    <Link
                        href={todayActivityHref(task.href)}
                        target={
                            task.href.startsWith("http") ? "_blank" : undefined
                        }
                        rel={
                            task.href.startsWith("http")
                                ? "noopener noreferrer"
                                : undefined
                        }
                        className="mt-3 inline-flex min-h-9 items-center gap-1 text-xs font-semibold text-primary hover:underline"
                    >
                        {t("openTask")}
                        <ArrowRight
                            aria-hidden="true"
                            className="size-3 rtl:rotate-180"
                        />
                    </Link>
                )}
            </article>
        );
    }

    return (
        <div className="space-y-6 pb-8" aria-busy={pending}>
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        aria-label={t("previousWeek")}
                        disabled={dirty || pending || weekOffset <= 0}
                        onClick={() =>
                            router.push(`/weekly?week=${shiftWeek(-1)}`)
                        }
                    >
                        <ArrowLeft className="size-4 rtl:rotate-180" />
                    </Button>
                    <div className="min-w-40 px-2 text-center">
                        <h2 className="text-sm font-semibold">
                            {formatDate(dates[0])} –{" "}
                            {formatDate(dates[6], {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                            })}
                        </h2>
                        <p className="mt-1 text-xs text-muted-foreground">
                            {weekOffset === 0
                                ? t("thisWeek")
                                : t("upcomingWeek")}
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        size="icon"
                        aria-label={t("nextWeek")}
                        disabled={dirty || pending || weekOffset >= 3}
                        onClick={() =>
                            router.push(`/weekly?week=${shiftWeek(1)}`)
                        }
                    >
                        <ArrowRight className="size-4 rtl:rotate-180" />
                    </Button>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-card px-3 py-1.5 text-xs text-muted-foreground">
                    <Clock3 className="size-3.5" />
                    {view.timezone}
                </span>
            </div>

            <section
                className="overflow-hidden rounded-3xl border border-border/50 bg-card shadow-sm"
                aria-label={t("workload")}
            >
                <div className="grid grid-cols-3 divide-x divide-border/40 border-b border-border/40 rtl:divide-x-reverse">
                    {[
                        {
                            label: t("plannedTime"),
                            value: t("minutes", {
                                count: loads.reduce(
                                    (sum, day) => sum + day.minutes,
                                    0,
                                ),
                            }),
                            warning: false,
                        },
                        {
                            label: t("overloadedDays"),
                            value: number(overloaded.length),
                            warning: overloaded.length > 0,
                        },
                        {
                            label: t("roomLeft"),
                            value: t("minutes", {
                                count: loads
                                    .filter((day) => day.date >= view.today)
                                    .reduce(
                                        (sum, day) =>
                                            sum +
                                            Math.max(
                                                0,
                                                day.capacity - day.minutes,
                                            ),
                                        0,
                                    ),
                            }),
                            warning: false,
                        },
                    ].map((stat) => (
                        <div key={stat.label} className="p-4 sm:px-6 sm:py-5">
                            <p className="text-[11px] leading-5 text-muted-foreground sm:text-xs">
                                {stat.label}
                            </p>
                            <p
                                className={cn(
                                    "mt-1.5 text-lg font-semibold tracking-tight sm:text-2xl",
                                    stat.warning && "text-destructive",
                                )}
                            >
                                {stat.value}
                            </p>
                        </div>
                    ))}
                </div>
                <div className="p-4 sm:p-6">
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm font-medium">{t("workload")}</p>
                        <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <span className="h-0 w-4 border-t border-dashed border-muted-foreground" />
                            {t("capacityLine")}
                        </span>
                    </div>
                    <div
                        className="grid grid-cols-7 gap-2 sm:gap-5"
                        role="img"
                        aria-label={loads
                            .map((day) =>
                                t("loadDescription", {
                                    day: dayName(day.date),
                                    minutes: day.minutes,
                                    capacity: day.capacity,
                                }),
                            )
                            .join(". ")}
                    >
                        {loads.map((day) => (
                            <div key={day.date} className="min-w-0 text-center">
                                <div className="relative flex h-24 items-end justify-center rounded-lg bg-muted/35">
                                    <span className="absolute inset-x-0 top-1/3 border-t border-dashed border-muted-foreground/45" />
                                    <span
                                        className={cn(
                                            "relative w-2/3 rounded-t-md transition-[height] motion-reduce:transition-none",
                                            day.over
                                                ? "bg-destructive/75"
                                                : "bg-primary/70",
                                        )}
                                        style={{
                                            height: `${Math.min(100, (day.minutes / Math.max(day.capacity, 1)) * 66.67)}%`,
                                        }}
                                    />
                                </div>
                                <p className="mt-2 truncate text-[10px] font-medium sm:text-xs">
                                    {dayName(day.date)}
                                </p>
                                <p
                                    className={cn(
                                        "mt-1 text-[10px] tabular-nums sm:text-xs",
                                        day.over
                                            ? "text-destructive"
                                            : "text-muted-foreground",
                                    )}
                                >
                                    {number(day.minutes)} /{" "}
                                    {number(day.capacity)}
                                </p>
                            </div>
                        ))}
                    </div>
                    <p className="mt-5 text-xs leading-6 text-muted-foreground">
                        {t("estimatesHint")}
                    </p>
                </div>
            </section>

            <fieldset disabled={pending || stale} className="min-w-0 space-y-6">
                <legend className="sr-only">{t("editWeek")}</legend>
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-semibold">
                            {t("yourWeek")}
                        </h2>
                        <p className="mt-1 text-xs leading-6 text-muted-foreground">
                            {t("moveHint")}
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        disabled={!view.tasks.some((task) => task.movable)}
                        onClick={() => {
                            setDraft(balanceWeek(view, draft));
                            setAcknowledged(false);
                            toast.success(t("balanced"));
                        }}
                    >
                        <Sparkles className="size-4" />
                        {t("balance")}
                    </Button>
                </div>
                <nav
                    className="grid grid-cols-7 gap-1 sm:hidden"
                    aria-label={t("chooseDay")}
                >
                    {loads.map((day) => (
                        <button
                            key={day.date}
                            type="button"
                            aria-current={
                                view.today === day.date ? "date" : undefined
                            }
                            onClick={() =>
                                scrollToDay(boardRef.current, day.date)
                            }
                            className={cn(
                                "min-h-16 min-w-0 rounded-xl border px-1 py-2 text-center outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                view.today === day.date
                                    ? "border-primary/45 bg-primary/10 text-primary"
                                    : "border-border/40 bg-card text-muted-foreground",
                            )}
                        >
                            <span className="block truncate text-[10px]">
                                {dayName(day.date)}
                            </span>
                            <span className="mt-1 block text-sm font-semibold">
                                {formatDate(day.date, { day: "numeric" })}
                            </span>
                            {day.over > 0 && (
                                <span
                                    role="img"
                                    aria-label={t("overloaded")}
                                    className="mx-auto mt-1 block size-1.5 rounded-full bg-destructive"
                                />
                            )}
                        </button>
                    ))}
                </nav>
                <p
                    id="week-scroll-hint"
                    className="text-xs text-muted-foreground"
                >
                    {t("scrollHint")}
                </p>
                <section
                    ref={boardRef}
                    id="weekly-day-board"
                    aria-label={t("yourWeek")}
                    aria-describedby="week-scroll-hint"
                    // biome-ignore lint/a11y/noNoninteractiveTabindex: Allows keyboard scrolling across the week.
                    tabIndex={0}
                    className="grid max-w-full auto-cols-[min(19rem,calc(100%_-_1.5rem))] grid-flow-col items-start gap-4 overflow-x-auto overscroll-x-contain snap-x snap-mandatory rounded-2xl pb-4 outline-none [scrollbar-width:thin] focus-visible:ring-2 focus-visible:ring-ring"
                >
                    {loads.map((day, index) => (
                        <section
                            key={day.date}
                            data-planning-date={day.date}
                            aria-label={formatDate(day.date, {
                                weekday: "long",
                                month: "short",
                                day: "numeric",
                            })}
                            className={cn(
                                "min-w-0 snap-start overflow-hidden rounded-2xl border bg-muted/15",
                                day.over
                                    ? "border-destructive/40"
                                    : "border-border/45",
                            )}
                        >
                            <div
                                className={cn(
                                    "border-b border-border/35 p-4",
                                    day.date === view.today &&
                                        "bg-primary/[0.06]",
                                )}
                            >
                                <div className="flex items-center justify-between gap-1">
                                    <h3 className="text-sm font-semibold">
                                        {dayName(day.date)}
                                    </h3>
                                    <time
                                        dateTime={day.date}
                                        className="flex size-8 items-center justify-center rounded-full bg-background text-sm tabular-nums text-muted-foreground"
                                    >
                                        {formatDate(day.date, {
                                            day: "numeric",
                                        })}
                                    </time>
                                </div>
                                <label
                                    htmlFor={`budget-${day.date}`}
                                    className="mt-4 flex items-center justify-between gap-3 whitespace-nowrap text-xs text-muted-foreground"
                                >
                                    {t("budget")}
                                    <MinutesInput
                                        id={`budget-${day.date}`}
                                        aria-label={t("budgetFor", {
                                            day: formatDate(day.date, {
                                                weekday: "long",
                                            }),
                                        })}
                                        type="number"
                                        min={0}
                                        max={480}
                                        step={5}
                                        value={draft.capacities[index]}
                                        onChange={(minutes) => {
                                            setAcknowledged(false);
                                            setDraft((current) => ({
                                                ...current,
                                                capacities:
                                                    current.capacities.map(
                                                        (capacity, i) =>
                                                            i === index
                                                                ? minutes
                                                                : capacity,
                                                    ),
                                            }));
                                        }}
                                        className="h-9 w-20 bg-background px-2 text-center text-sm"
                                    />
                                </label>
                                <p
                                    className={cn(
                                        "mt-3 text-xs leading-5",
                                        day.over
                                            ? "font-medium text-destructive"
                                            : "text-muted-foreground",
                                    )}
                                >
                                    {day.over
                                        ? t("overBy", { count: day.over })
                                        : t("freeMinutes", {
                                              count: Math.max(
                                                  0,
                                                  day.capacity - day.minutes,
                                              ),
                                          })}
                                </p>
                            </div>
                            <div className="min-h-40 space-y-3 p-3">
                                {view.tasks
                                    .filter(
                                        (task) =>
                                            draft.tasks.find(
                                                (item) => item.id === task.id,
                                            )?.date === day.date,
                                    )
                                    .map(taskCard)}
                                {day.count === 0 && (
                                    <p className="px-2 py-8 text-center text-xs leading-6 text-muted-foreground">
                                        {t("openDay")}
                                    </p>
                                )}
                            </div>
                        </section>
                    ))}
                </section>
                {unplaced.length > 0 && (
                    <section className="rounded-2xl border border-dashed border-border/70 bg-card/40 p-4 sm:p-5">
                        <div className="mb-4 flex items-center gap-3">
                            <span className="rounded-xl bg-muted p-2.5">
                                <Inbox className="size-4 text-muted-foreground" />
                            </span>
                            <div>
                                <h2 className="text-sm font-semibold">
                                    {t("inbox", { count: unplaced.length })}
                                </h2>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {t("inboxHint")}
                                </p>
                            </div>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {view.tasks
                                .filter(
                                    (task) =>
                                        !draft.tasks.find(
                                            (item) => item.id === task.id,
                                        )?.date,
                                )
                                .map(taskCard)}
                        </div>
                    </section>
                )}
                {!view.tasks.length && (
                    <section className="rounded-2xl border border-dashed border-border/60 p-8 text-center">
                        <CalendarDays className="mx-auto size-8 text-primary" />
                        <h2 className="mt-4 font-semibold">{t("empty")}</h2>
                        <p className="mx-auto mt-2 max-w-lg text-sm leading-7 text-muted-foreground">
                            {t("emptyHint")}
                        </p>
                        <div className="mt-5 flex flex-wrap justify-center gap-3">
                            <Button asChild variant="outline">
                                <Link href="/plans?create=1">
                                    {plansT("create")}
                                </Link>
                            </Button>
                            <Button asChild>
                                <Link href="/plans">{plansT("myPlans")}</Link>
                            </Button>
                        </div>
                    </section>
                )}
            </fieldset>

            <p className="text-xs leading-6 text-muted-foreground">
                {t("rulesHint")}
            </p>
            <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm sm:p-5">
                {stale ? (
                    <div
                        role="alert"
                        className="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm text-destructive"
                    >
                        <span>{t("errors.stale")}</span>
                        <Button
                            variant="outline"
                            onClick={() => router.refresh()}
                        >
                            {t("reload")}
                        </Button>
                    </div>
                ) : (
                    invalid && (
                        <p
                            role="alert"
                            className="mb-4 text-sm text-destructive"
                        >
                            {t(`errors.${invalid}`)}
                        </p>
                    )
                )}
                {overloaded.length > 0 && (
                    <div className="mb-4 rounded-xl bg-destructive/10 p-3">
                        <p className="flex items-start gap-2 text-xs font-medium leading-6 text-destructive">
                            <AlertTriangle className="mt-1 size-4 shrink-0" />
                            {t("overloadHint", { count: overloaded.length })}
                        </p>
                        <label className="mt-2 flex min-h-9 cursor-pointer items-center gap-2 text-xs leading-6">
                            <input
                                type="checkbox"
                                checked={acknowledged}
                                disabled={pending || stale}
                                onChange={(event) =>
                                    setAcknowledged(event.target.checked)
                                }
                                className="size-4 accent-primary"
                            />
                            {t("acknowledge")}
                        </label>
                    </div>
                )}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <output className="flex items-center gap-2 text-xs text-muted-foreground">
                        {dirty ? (
                            <span className="size-2 rounded-full bg-primary" />
                        ) : (
                            <Check className="size-4 text-primary" />
                        )}
                        {dirty ? t("draftHint") : t("savedHint")}
                    </output>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant="ghost"
                            disabled={!dirty || pending}
                            onClick={() => {
                                setDraft(initialDraft(view));
                                setAcknowledged(false);
                            }}
                        >
                            <RotateCcw className="size-4" />
                            {t("reset")}
                        </Button>
                        <Button
                            disabled={
                                !dirty ||
                                pending ||
                                stale ||
                                Boolean(invalid) ||
                                (overloaded.length > 0 && !acknowledged)
                            }
                            onClick={() =>
                                startTransition(async () => {
                                    try {
                                        const result = await savePlanningWeek(
                                            draft,
                                            acknowledged,
                                        );
                                        if (!result.success) {
                                            toast.error(
                                                t(`errors.${result.reason}`),
                                            );
                                            if (result.reason === "stale")
                                                setStale(true);
                                            return;
                                        }
                                        toast.success(t("saved"));
                                        router.refresh();
                                    } catch {
                                        toast.error(t("errors.failed"));
                                    }
                                })
                            }
                        >
                            {pending ? (
                                <LoaderCircle className="size-4 animate-spin" />
                            ) : (
                                <Check className="size-4" />
                            )}
                            {t("commit")}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
