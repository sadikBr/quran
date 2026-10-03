"use client";

import {
    ArrowRight,
    CalendarDays,
    ChevronDown,
    Info,
    RefreshCw,
    Shuffle,
} from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const HIZB_MARKERS = Array.from({ length: 60 }, (_, i) => i + 1);

export default function MemorizationOverview({
    completed,
    memorizedAyahs,
    progressHizbs,
    setup,
}: {
    completed: number;
    memorizedAyahs: number;
    progressHizbs: number;
    setup: boolean;
}) {
    const t = useTranslations("Memorization");
    const locale = useLocale();
    const number = new Intl.NumberFormat(locale);
    const percentage = new Intl.NumberFormat(locale, {
        style: "percent",
        maximumFractionDigits: 1,
    }).format(progressHizbs / 60);
    const shortcuts = [
        {
            href: "/memorization/plan",
            icon: CalendarDays,
            title: t("learning.title"),
            description: t("learning.intro"),
            action: t("learning.openPlan"),
            featured: true,
        },
        {
            href: "/memorization/revision",
            icon: CalendarDays,
            title: t("weekly.title"),
            description: t("overview.revisionHint"),
            action: t("overview.revisionAction"),
            featured: true,
        },
        {
            href: "/memorization/test",
            icon: Shuffle,
            title: t("overview.testTitle"),
            description: t("overview.testHint"),
            action: t("overview.testAction"),
            featured: false,
        },
    ];

    return (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
            <section
                aria-labelledby="memorization-summary-title"
                className="relative isolate flex min-w-0 flex-col overflow-hidden rounded-3xl border border-primary/20 bg-card/70 p-5 sm:p-7"
            >
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -end-16 -top-20 -z-10 size-64 rounded-full bg-primary/[0.06] blur-3xl"
                />
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2
                        id="memorization-summary-title"
                        className="text-sm font-medium text-muted-foreground"
                    >
                        {t("overview.title")}
                    </h2>
                    {setup && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/[0.08] px-2.5 py-1 text-[0.7rem] font-medium text-primary">
                            <RefreshCw aria-hidden="true" className="size-3" />
                            {t("overview.automatic")}
                        </span>
                    )}
                </div>
                <div className="my-5 flex items-baseline gap-3 sm:my-6">
                    <span className="text-6xl font-semibold leading-none tracking-tight text-primary tabular-nums sm:text-7xl">
                        {number.format(completed)}
                    </span>
                    <span className="text-sm text-muted-foreground sm:text-base">
                        {t("overview.total", { total: number.format(60) })}
                    </span>
                </div>
                <div className="mt-auto space-y-3">
                    <p className="text-sm font-medium text-primary">
                        {t("overview.memorizedAyahs", {
                            count: memorizedAyahs,
                        })}
                    </p>
                    <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="text-muted-foreground">
                            {t("progressEyebrow")}
                        </span>
                        <span className="font-semibold text-primary tabular-nums">
                            {percentage}
                        </span>
                    </div>
                    <div
                        role="progressbar"
                        aria-label={t("overview.title")}
                        aria-valuenow={progressHizbs}
                        aria-valuemin={0}
                        aria-valuemax={60}
                        aria-valuetext={t("overview.memorizedAyahs", {
                            count: memorizedAyahs,
                        })}
                        className="grid h-4 grid-cols-[repeat(60,minmax(0,1fr))] gap-0.5 sm:gap-[3px]"
                    >
                        {HIZB_MARKERS.map((hizb) => (
                            <span
                                key={hizb}
                                aria-hidden="true"
                                className={cn(
                                    "overflow-hidden rounded-full bg-primary/10",
                                )}
                            >
                                <span
                                    className="block h-full bg-primary"
                                    style={{
                                        width: `${Math.max(0, Math.min(1, progressHizbs - hizb + 1)) * 100}%`,
                                    }}
                                />
                            </span>
                        ))}
                    </div>
                    <p className="text-sm leading-6 text-muted-foreground">
                        {t(
                            completed === 60
                                ? "completeDescription"
                                : setup
                                  ? "overview.remaining"
                                  : "overview.setupHint",
                            { count: 60 - completed },
                        )}
                    </p>
                </div>
                <details className="group mt-5 border-t border-border/40 pt-3">
                    <summary className="flex min-h-8 cursor-pointer list-none items-center gap-2 rounded-md text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                        <Info
                            aria-hidden="true"
                            className="size-3.5 shrink-0"
                        />
                        <span>{t("overview.how")}</span>
                        <ChevronDown
                            aria-hidden="true"
                            className="ms-auto size-3.5 transition-transform group-open:rotate-180"
                        />
                    </summary>
                    <p className="pt-2 text-xs leading-6 text-muted-foreground">
                        {t("record.automatic")}
                    </p>
                </details>
            </section>
            <nav
                aria-label={t("overview.actions")}
                className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1"
            >
                {shortcuts.map(
                    ({
                        href,
                        icon: Icon,
                        title,
                        description,
                        action,
                        featured,
                    }) => (
                        <Link
                            key={href}
                            href={href}
                            className={cn(
                                "group flex min-w-0 items-start gap-3.5 rounded-2xl border p-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:p-5",
                                featured
                                    ? "border-primary/20 bg-primary/[0.06] hover:bg-primary/10"
                                    : "border-border/40 bg-card/35 hover:border-primary/25 hover:bg-card/70",
                            )}
                        >
                            <span
                                aria-hidden="true"
                                className={cn(
                                    "flex size-10 shrink-0 items-center justify-center rounded-xl",
                                    featured
                                        ? "bg-primary/10 text-primary"
                                        : "bg-muted/60 text-muted-foreground",
                                )}
                            >
                                <Icon className="size-5" />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block font-semibold leading-6">
                                    {title}
                                </span>
                                <span className="mt-1 block text-xs leading-6 text-muted-foreground sm:text-sm">
                                    {description}
                                </span>
                                <span className="mt-3 flex items-center justify-between gap-3 text-xs font-medium text-primary">
                                    {action}
                                    <ArrowRight
                                        aria-hidden="true"
                                        className="size-4 shrink-0 transition-transform group-hover:ltr:translate-x-1 group-hover:rtl:-translate-x-1 rtl:rotate-180"
                                    />
                                </span>
                            </span>
                        </Link>
                    ),
                )}
            </nav>
        </div>
    );
}
