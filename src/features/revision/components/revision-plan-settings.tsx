"use client";

import {
    ArrowRight,
    Bell,
    BookOpen,
    CalendarDays,
    Check,
    Clock3,
    Globe2,
    LoaderCircle,
    SlidersHorizontal,
} from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { RevisionSettings } from "../schedule";

const DAYS = [1, 2, 3, 4, 5, 6, 7];
const AMOUNTS = [1, 2, 4] as const;
const QUARTERS = [1, 2, 3, 4];

export default function RevisionPlanSettings({
    settings,
    pending,
    hasPlan,
    onChange,
    onPreview,
    onCancel,
}: {
    settings: RevisionSettings;
    pending: boolean;
    hasPlan: boolean;
    onChange: (value: Partial<RevisionSettings>) => void;
    onPreview: () => void;
    onCancel: () => void;
}) {
    const t = useTranslations("Memorization.weekly");
    const locale = useLocale();
    const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
    const reminders = settings.reminderTime !== null;

    return (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(17rem,1fr)]">
            <section
                aria-labelledby="revision-settings-title"
                className="min-w-0 overflow-hidden rounded-3xl border border-border/45 bg-card/50"
            >
                <div className="flex items-start gap-3 border-b border-border/35 px-5 py-5 sm:px-6">
                    <span
                        aria-hidden="true"
                        className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/[0.08] text-primary"
                    >
                        <SlidersHorizontal className="size-5" />
                    </span>
                    <div>
                        <h2
                            id="revision-settings-title"
                            className="font-semibold"
                        >
                            {t("settings")}
                        </h2>
                        <p className="mt-1 text-xs leading-6 text-muted-foreground">
                            {t("editor.intro")}
                        </p>
                    </div>
                </div>
                <div className="space-y-7 p-5 sm:p-6">
                    <fieldset disabled={pending}>
                        <legend className="mb-3 text-sm font-medium">
                            {t("days")}
                        </legend>
                        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                            {DAYS.map((day) => {
                                const selected = settings.days.includes(day);
                                return (
                                    <label
                                        key={day}
                                        className="min-w-0 cursor-pointer"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selected}
                                            className="peer sr-only"
                                            onChange={() =>
                                                onChange({
                                                    days: selected
                                                        ? settings.days.filter(
                                                              (d) => d !== day,
                                                          )
                                                        : [
                                                              ...settings.days,
                                                              day,
                                                          ].sort(
                                                              (a, b) => a - b,
                                                          ),
                                                })
                                            }
                                        />
                                        <span
                                            className={cn(
                                                "flex min-h-16 flex-col items-center justify-center gap-2 rounded-xl border px-1 py-2.5 text-xs transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background peer-disabled:cursor-wait peer-disabled:opacity-60",
                                                selected
                                                    ? "border-primary/35 bg-primary/10 font-semibold text-primary"
                                                    : "border-border/40 bg-background/30 text-muted-foreground hover:border-primary/30 hover:text-foreground",
                                            )}
                                        >
                                            {t(`day${day}`)}
                                            <span
                                                aria-hidden="true"
                                                className={cn(
                                                    "flex size-4 items-center justify-center rounded-full border",
                                                    selected
                                                        ? "border-primary bg-primary text-primary-foreground"
                                                        : "border-border/80",
                                                )}
                                            >
                                                {selected && (
                                                    <Check
                                                        className="size-3"
                                                        strokeWidth={3}
                                                    />
                                                )}
                                            </span>
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                        {!settings.days.length && (
                            <p className="mt-2 text-xs text-primary">
                                {t("editor.chooseDays")}
                            </p>
                        )}
                    </fieldset>

                    <fieldset disabled={pending}>
                        <legend className="mb-3 text-sm font-medium">
                            {t("amount")}
                        </legend>
                        <div className="grid grid-cols-3 gap-2.5">
                            {AMOUNTS.map((amount) => (
                                <label
                                    key={amount}
                                    className="min-w-0 cursor-pointer"
                                >
                                    <input
                                        type="radio"
                                        name="revision-amount"
                                        value={amount}
                                        checked={
                                            settings.quartersPerDay === amount
                                        }
                                        onChange={() =>
                                            onChange({ quartersPerDay: amount })
                                        }
                                        className="peer sr-only"
                                    />
                                    <span className="flex h-full min-h-24 flex-col items-center justify-center gap-3 rounded-2xl border border-border/40 bg-background/30 px-2 py-4 text-center text-sm text-muted-foreground transition-colors hover:border-primary/30 peer-checked:border-primary/40 peer-checked:bg-primary/[0.08] peer-checked:font-semibold peer-checked:text-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background peer-disabled:cursor-wait peer-disabled:opacity-60">
                                        <span
                                            aria-hidden="true"
                                            className="flex gap-1"
                                        >
                                            {QUARTERS.map((q) => (
                                                <span
                                                    key={q}
                                                    className={cn(
                                                        "h-5 w-2 rounded-full",
                                                        q <= amount
                                                            ? "bg-current"
                                                            : "bg-primary/10",
                                                    )}
                                                />
                                            ))}
                                        </span>
                                        {t(`amount${amount}`)}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </fieldset>

                    <div className="grid gap-5 border-t border-border/35 pt-5 sm:grid-cols-2">
                        <fieldset disabled={pending}>
                            <legend className="mb-2.5 text-sm font-medium">
                                {t("editor.reading")}
                            </legend>
                            <div className="grid grid-cols-2 gap-1 rounded-xl border border-border/40 bg-background/30 p-1">
                                {(["hafs", "warsh"] as const).map((riwayah) => (
                                    <label
                                        key={riwayah}
                                        className="cursor-pointer"
                                    >
                                        <input
                                            type="radio"
                                            name="revision-reading"
                                            value={riwayah}
                                            checked={
                                                settings.riwayah === riwayah
                                            }
                                            onChange={() =>
                                                onChange({ riwayah })
                                            }
                                            className="peer sr-only"
                                        />
                                        <span className="flex min-h-10 items-center justify-center rounded-lg text-sm text-muted-foreground transition-colors hover:text-foreground peer-checked:bg-primary/10 peer-checked:font-medium peer-checked:text-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-disabled:cursor-wait peer-disabled:opacity-60">
                                            {t(riwayah)}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </fieldset>
                        <div>
                            <label
                                htmlFor="revision-timezone"
                                className="mb-2.5 block text-sm font-medium"
                            >
                                {t("timezone")}
                            </label>
                            <div className="relative">
                                <Globe2
                                    aria-hidden="true"
                                    className="pointer-events-none absolute right-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground"
                                />
                                <Input
                                    id="revision-timezone"
                                    disabled={pending}
                                    value={settings.timezone}
                                    onChange={(e) =>
                                        onChange({ timezone: e.target.value })
                                    }
                                    placeholder="Africa/Casablanca"
                                    dir="ltr"
                                    className="h-12 rounded-xl border-border/40 bg-background/30 pe-10 text-sm shadow-none dark:bg-background/30"
                                />
                            </div>
                        </div>
                    </div>

                    <div
                        className={cn(
                            "rounded-2xl border p-4 transition-colors",
                            reminders
                                ? "border-primary/25 bg-primary/[0.04]"
                                : "border-border/35 bg-background/20",
                        )}
                    >
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <Bell
                                    aria-hidden="true"
                                    className="size-4 shrink-0 text-muted-foreground"
                                />
                                <div>
                                    <p
                                        id="revision-reminder-label"
                                        className="text-sm font-medium"
                                    >
                                        {t("reminder")}
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        {t("editor.reminderHint")}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                role="switch"
                                aria-checked={reminders}
                                aria-labelledby="revision-reminder-label"
                                disabled={pending}
                                onClick={() =>
                                    onChange({
                                        reminderTime: reminders
                                            ? null
                                            : "19:00",
                                    })
                                }
                                className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-60"
                            >
                                <span
                                    aria-hidden="true"
                                    dir="ltr"
                                    className={cn(
                                        "relative block h-6 w-11 rounded-full border transition-colors",
                                        reminders
                                            ? "border-primary bg-primary"
                                            : "border-border bg-muted",
                                    )}
                                >
                                    <span
                                        className={cn(
                                            "absolute left-0.5 top-0.5 size-[18px] rounded-full transition-transform",
                                            reminders
                                                ? "translate-x-5 bg-primary-foreground"
                                                : "bg-muted-foreground",
                                        )}
                                    />
                                </span>
                            </button>
                        </div>
                        {reminders && (
                            <div className="mt-4 space-y-3 border-t border-primary/15 pt-4">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <label
                                        htmlFor="revision-reminder-time"
                                        className="text-sm"
                                    >
                                        {t("reminderTime")}
                                    </label>
                                    <Input
                                        id="revision-reminder-time"
                                        type="time"
                                        disabled={pending}
                                        value={settings.reminderTime ?? ""}
                                        onChange={(e) =>
                                            onChange({
                                                reminderTime: e.target.value,
                                            })
                                        }
                                        className="h-11 w-auto min-w-32 rounded-xl border-border/40 bg-background/30 dark:bg-background/30"
                                    />
                                </div>
                                <p className="text-xs leading-6 text-muted-foreground">
                                    {t("reminderHint")}{" "}
                                    <Link
                                        href="/settings"
                                        className="text-primary underline underline-offset-4"
                                    >
                                        {t("deviceSettings")}
                                    </Link>
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            <aside
                aria-labelledby="revision-summary-title"
                className="min-w-0 rounded-3xl border border-primary/20 bg-primary/[0.04] p-5 sm:p-6 lg:sticky lg:top-24"
            >
                <h2
                    id="revision-summary-title"
                    className="flex items-center gap-2 text-sm font-semibold"
                >
                    <CalendarDays
                        aria-hidden="true"
                        className="size-4 text-primary"
                    />
                    {t("editor.summary")}
                </h2>
                <div className="my-5 grid grid-cols-2 divide-x divide-border/40 rtl:divide-x-reverse">
                    <div className="pe-4">
                        <p className="text-3xl font-semibold text-primary tabular-nums">
                            {number.format(settings.days.length)}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                            {t("editor.daysPerWeek")}
                        </p>
                    </div>
                    <div className="ps-4">
                        <p className="text-3xl font-semibold text-primary tabular-nums">
                            {number.format(
                                (settings.days.length *
                                    settings.quartersPerDay) /
                                    4,
                            )}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                            {t("editor.weeklyMaximum")}
                        </p>
                    </div>
                </div>
                <p className="text-xs leading-6 text-muted-foreground">
                    {t("editor.limitHint")}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-primary/15 pt-4 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                        <BookOpen aria-hidden="true" className="size-3.5" />
                        {t(settings.riwayah)}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <Clock3 aria-hidden="true" className="size-3.5" />
                        {t(`amount${settings.quartersPerDay}`)}
                        {t("editor.eachDay")}
                    </span>
                </div>
                <p className="mb-5 mt-5 text-xs leading-6 text-muted-foreground">
                    {t(hasPlan ? "previewHint" : "editor.previewHint")}
                </p>
                <Button
                    onClick={onPreview}
                    disabled={
                        pending || !settings.days.length || !settings.timezone
                    }
                    className="min-h-12 w-full justify-between rounded-xl px-4"
                >
                    {t("preview")}
                    {pending ? (
                        <LoaderCircle
                            aria-hidden="true"
                            className="size-4 animate-spin"
                        />
                    ) : (
                        <ArrowRight
                            aria-hidden="true"
                            className="size-4 rtl:rotate-180"
                        />
                    )}
                </Button>
                {hasPlan && (
                    <Button
                        variant="ghost"
                        onClick={onCancel}
                        disabled={pending}
                        className="mt-2 min-h-11 w-full rounded-xl text-muted-foreground"
                    >
                        {t("cancel")}
                    </Button>
                )}
            </aside>
        </div>
    );
}
