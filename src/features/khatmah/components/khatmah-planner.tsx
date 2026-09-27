"use client";

import {
    CalendarDays,
    Minus,
    Pause,
    Play,
    Plus,
    Repeat2,
    Sparkles,
    Target,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import toggleKhatmahPlan from "../server/toggle-khatmah-plan";
import updateKhatmahPlan from "../server/update-khatmah-plan";
import type { KhatmahMeasurement, KhatmahPlan } from "../types";

interface SurahOption {
    number: number;
    name: string;
    englishName: string;
}

export default function KhatmahPlanner({
    plan,
    surahs,
    initialStartSurah,
}: {
    plan: KhatmahPlan | null;
    surahs: SurahOption[];
    initialStartSurah: number;
}) {
    const t = useTranslations("Khatmah");
    const locale = useLocale();
    const router = useRouter();
    const [editing, setEditing] = useState(!plan);
    const [durationWeeks, setDurationWeeks] = useState(
        plan?.durationWeeks ?? 8,
    );
    const [repeatable, setRepeatable] = useState(plan?.repeatable ?? false);
    const [startSurah, setStartSurah] = useState(initialStartSurah);
    const [measurement, setMeasurement] = useState<KhatmahMeasurement>(
        plan?.measurement ?? "page",
    );
    const [restDays, setRestDays] = useState<number[]>(plan?.restDays ?? []);
    const [saving, setSaving] = useState(false);
    const measurements: KhatmahMeasurement[] = ["page", "hizb", "juz"];
    const weekdayFormatter = new Intl.DateTimeFormat(locale, {
        weekday: "short",
        timeZone: "UTC",
    });
    const dateFormatter = new Intl.DateTimeFormat(locale, {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
    });
    const weekdays = Array.from({ length: 7 }, (_, day) => ({
        day,
        label: weekdayFormatter.format(new Date(Date.UTC(2026, 0, 4 + day))),
    }));

    async function save() {
        setSaving(true);
        const result = await updateKhatmahPlan({
            durationWeeks,
            repeatable,
            startSurah,
            measurement,
            restDays,
        });
        setSaving(false);
        if (!result.success) {
            toast.error(t("form.error"));
            return;
        }
        toast.success(t("form.success"));
        setEditing(false);
        router.refresh();
    }

    async function toggle() {
        if (!plan) return;
        setSaving(true);
        const result = await toggleKhatmahPlan(!plan.isActive);
        setSaving(false);
        if (!result.success) toast.error(t("form.error"));
        else router.refresh();
    }

    return (
        <section className="mt-12 overflow-hidden bg-primary/[0.055]">
            <div className="grid md:grid-cols-[0.8fr_1.2fr]">
                <div className="relative overflow-hidden bg-primary px-6 py-8 text-primary-foreground sm:px-8">
                    <Sparkles className="absolute -end-5 -top-5 size-28 opacity-10" />
                    <p className="text-xs font-semibold tracking-[0.18em] uppercase opacity-75">
                        {t("eyebrow")}
                    </p>
                    <h2 className="mt-3 text-2xl font-semibold tracking-tight">
                        {t("title")}
                    </h2>
                    <p className="mt-3 max-w-sm text-sm leading-6 opacity-80">
                        {t("description")}
                    </p>
                    {plan && (
                        <div className="mt-8">
                            <div className="flex items-end justify-between gap-4">
                                <span className="text-4xl font-semibold tabular-nums">
                                    {plan.progressPercentage}%
                                </span>
                                <span className="text-xs opacity-75">
                                    {t("summary.complete")}
                                </span>
                            </div>
                            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-primary-foreground/20">
                                <div
                                    className="h-full rounded-full bg-primary-foreground transition-[width]"
                                    style={{
                                        width: `${plan.progressPercentage}%`,
                                    }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                <div className="px-5 py-7 sm:px-8 sm:py-8">
                    {plan && !editing ? (
                        <div>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-7 sm:grid-cols-3">
                                <Summary
                                    icon={Repeat2}
                                    label={t("summary.cadence")}
                                    value={t("summary.weeks", {
                                        count: plan.durationWeeks,
                                    })}
                                />
                                <Summary
                                    icon={Target}
                                    label={t("summary.dailyPace")}
                                    value={t("summary.amount", {
                                        amount: plan.dailyAmount,
                                        unit: t(
                                            `measurements.${plan.measurement}`,
                                        ),
                                    })}
                                />
                                <Summary
                                    icon={CalendarDays}
                                    label={t("summary.deadline")}
                                    value={dateFormatter.format(
                                        new Date(
                                            `${plan.targetDate}T12:00:00Z`,
                                        ),
                                    )}
                                />
                            </div>
                            <p className="mt-7 text-sm leading-6 text-muted-foreground">
                                {t("summary.adaptiveNote")}
                            </p>
                            {plan.repeatable && (
                                <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
                                    <Repeat2 className="size-3.5" />
                                    {t("summary.repeats")}
                                </p>
                            )}
                            <div className="mt-6 flex flex-wrap gap-3">
                                {plan.completed ? (
                                    <Button onClick={() => setEditing(true)}>
                                        {t("actions.startAgain")}
                                    </Button>
                                ) : (
                                    <Button onClick={() => setEditing(true)}>
                                        {t("actions.edit")}
                                    </Button>
                                )}
                                {!plan.completed && (
                                    <Button
                                        variant="outline"
                                        onClick={toggle}
                                        disabled={saving}
                                    >
                                        {plan.isActive ? (
                                            <Pause className="size-4" />
                                        ) : (
                                            <Play className="size-4" />
                                        )}
                                        {t(
                                            plan.isActive
                                                ? "actions.pause"
                                                : "actions.resume",
                                        )}
                                    </Button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <form
                            onSubmit={(event) => {
                                event.preventDefault();
                                save();
                            }}
                            className="space-y-7"
                        >
                            <div className="grid gap-5 sm:grid-cols-2">
                                <div className="space-y-2 text-sm font-medium">
                                    <span>{t("form.duration")}</span>
                                    <div
                                        dir="ltr"
                                        className="flex h-11 items-center justify-between rounded-xl border border-border bg-background px-1"
                                    >
                                        <button
                                            type="button"
                                            aria-label={t("form.decreaseWeeks")}
                                            disabled={durationWeeks <= 1}
                                            onClick={() =>
                                                setDurationWeeks((value) =>
                                                    Math.max(1, value - 1),
                                                )
                                            }
                                            className="flex size-9 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
                                        >
                                            <Minus className="size-4" />
                                        </button>
                                        <span className="font-semibold tabular-nums">
                                            {t("form.weeks", {
                                                count: durationWeeks,
                                            })}
                                        </span>
                                        <button
                                            type="button"
                                            aria-label={t("form.increaseWeeks")}
                                            disabled={durationWeeks >= 52}
                                            onClick={() =>
                                                setDurationWeeks((value) =>
                                                    Math.min(52, value + 1),
                                                )
                                            }
                                            className="flex size-9 cursor-pointer items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-30"
                                        >
                                            <Plus className="size-4" />
                                        </button>
                                    </div>
                                </div>
                                <label className="space-y-2 text-sm font-medium">
                                    <span>{t("form.startSurah")}</span>
                                    <select
                                        value={startSurah}
                                        onChange={(event) =>
                                            setStartSurah(
                                                Number(event.target.value),
                                            )
                                        }
                                        className="h-11 w-full rounded-xl border border-border bg-background px-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                                    >
                                        {surahs.map((surah) => (
                                            <option
                                                key={surah.number}
                                                value={surah.number}
                                            >
                                                {surah.number}.{" "}
                                                {locale === "ar"
                                                    ? surah.name
                                                    : surah.englishName}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            </div>

                            <div>
                                <p className="text-sm font-medium">
                                    {t("form.measurement")}
                                </p>
                                <div className="mt-2 grid grid-cols-3 gap-1 rounded-2xl bg-muted/70 p-1">
                                    {measurements.map((item) => (
                                        <button
                                            key={item}
                                            type="button"
                                            onClick={() => setMeasurement(item)}
                                            className={cn(
                                                "min-h-11 cursor-pointer rounded-xl px-3 text-sm font-medium text-muted-foreground transition-all",
                                                measurement === item &&
                                                    "bg-background text-foreground shadow-sm",
                                            )}
                                        >
                                            {t(`measurements.${item}`)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                type="button"
                                role="switch"
                                aria-checked={repeatable}
                                onClick={() => setRepeatable((value) => !value)}
                                className="flex w-full cursor-pointer items-center justify-between gap-5 rounded-2xl bg-primary/[0.06] px-4 py-4 text-start transition-colors hover:bg-primary/[0.09]"
                            >
                                <span className="flex items-start gap-3">
                                    <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
                                        <Repeat2 className="size-4" />
                                    </span>
                                    <span>
                                        <span className="block text-sm font-semibold">
                                            {t("form.repeat")}
                                        </span>
                                        <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                                            {t("form.repeatDescription", {
                                                count: durationWeeks,
                                            })}
                                        </span>
                                    </span>
                                </span>
                                <span
                                    className={cn(
                                        "relative h-6 w-11 shrink-0 rounded-full bg-muted-foreground/25 transition-colors",
                                        repeatable && "bg-primary",
                                    )}
                                >
                                    <span
                                        className={cn(
                                            "absolute top-1/2 start-1 size-4 -translate-y-1/2 rounded-full bg-white shadow-sm transition-transform",
                                            repeatable &&
                                                "translate-x-5 rtl:-translate-x-5",
                                        )}
                                    />
                                </span>
                            </button>

                            <div>
                                <div className="flex items-center justify-between gap-3">
                                    <p className="text-sm font-medium">
                                        {t("form.restDays")}
                                    </p>
                                    <span className="text-xs text-muted-foreground">
                                        {t("form.optional")}
                                    </span>
                                </div>
                                <div
                                    dir="ltr"
                                    className="mt-3 flex flex-wrap gap-2"
                                >
                                    {weekdays.map(({ day, label }) => {
                                        const selected = restDays.includes(day);
                                        return (
                                            <button
                                                key={day}
                                                type="button"
                                                aria-pressed={selected}
                                                onClick={() =>
                                                    setRestDays((current) =>
                                                        selected
                                                            ? current.filter(
                                                                  (value) =>
                                                                      value !==
                                                                      day,
                                                              )
                                                            : [...current, day],
                                                    )
                                                }
                                                className={cn(
                                                    "min-w-11 cursor-pointer rounded-full border px-3 py-2 text-xs font-semibold transition-colors",
                                                    selected
                                                        ? "border-primary bg-primary text-primary-foreground"
                                                        : "border-border bg-background text-muted-foreground hover:border-primary/50",
                                                )}
                                            >
                                                {label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="flex flex-wrap justify-end gap-3">
                                {plan && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => setEditing(false)}
                                    >
                                        {t("actions.cancel")}
                                    </Button>
                                )}
                                <Button
                                    type="submit"
                                    disabled={saving}
                                    className="min-w-40"
                                >
                                    {saving
                                        ? t("form.saving")
                                        : plan
                                          ? t("form.update")
                                          : t("form.save")}
                                </Button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </section>
    );
}

function Summary({
    icon: Icon,
    label,
    value,
}: {
    icon: typeof Target;
    label: string;
    value: string;
}) {
    return (
        <div>
            <Icon className="size-4 text-primary" aria-hidden="true" />
            <p className="mt-2 text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 font-semibold leading-5">{value}</p>
        </div>
    );
}
