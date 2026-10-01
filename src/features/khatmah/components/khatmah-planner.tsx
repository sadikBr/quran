"use client";

import {
    CalendarDays,
    Minus,
    Pause,
    Pencil,
    Play,
    Plus,
    Repeat2,
    RotateCcw,
    Sparkles,
    Target,
    Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import { cn } from "@/lib/utils";
import cancelKhatmahPlan from "../server/cancel-khatmah-plan";
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
    const [saving, setSaving] = useState(false);
    const inFlight = useRef(false);
    const [mode, setMode] = useState<"create" | "edit" | "restart">(
        plan ? "edit" : "create",
    );
    const [confirmRestart, setConfirmRestart] = useState(false);
    const [confirmEnd, setConfirmEnd] = useState(false);
    async function endPlan() {
        if (inFlight.current) return;
        inFlight.current = true;
        setSaving(true);
        try {
            const result = await cancelKhatmahPlan(true);
            if (!result.success) {
                toast.error(t("form.error"));
                return;
            }
            toast.success(t("form.ended"));
            setConfirmEnd(false);
            router.refresh();
        } catch {
            toast.error(t("form.error"));
        } finally {
            inFlight.current = false;
            setSaving(false);
        }
    }
    function openEditor(nextMode: "edit" | "restart") {
        setDurationWeeks(plan?.durationWeeks ?? 8);
        setRepeatable(plan?.repeatable ?? false);
        setMeasurement(plan?.measurement ?? "page");
        setStartSurah(initialStartSurah);
        setMode(nextMode);
        setEditing(true);
    }
    const measurements: KhatmahMeasurement[] = ["page", "hizb", "juz"];
    const dateFormatter = new Intl.DateTimeFormat(locale, {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
    });

    async function save(confirmed = false) {
        if (inFlight.current) return;
        if (mode === "restart" && !confirmed) {
            setConfirmRestart(true);
            return;
        }
        inFlight.current = true;
        setSaving(true);
        try {
            const result = await updateKhatmahPlan({
                mode,
                confirmRestart: confirmed,
                durationWeeks,
                repeatable,
                startSurah,
                measurement,
                restDays: [],
            });
            if (!result.success) {
                toast.error(t("form.error"));
                return;
            }
            toast.success(t("form.success"));
            setEditing(false);
            setConfirmRestart(false);
            router.refresh();
        } catch {
            toast.error(t("form.error"));
        } finally {
            inFlight.current = false;
            setSaving(false);
        }
    }

    async function toggle() {
        if (!plan || inFlight.current) return;
        inFlight.current = true;
        setSaving(true);
        try {
            const result = await toggleKhatmahPlan(!plan.isActive);
            if (!result.success) toast.error(t("form.error"));
            else router.refresh();
        } catch {
            toast.error(t("form.error"));
        } finally {
            inFlight.current = false;
            setSaving(false);
        }
    }

    return (
        <section
            id="khatmah-plan"
            tabIndex={-1}
            className="app-card mt-6 scroll-mt-28 overflow-hidden"
        >
            <ConfirmationDialog
                open={confirmEnd}
                onOpenChange={setConfirmEnd}
                title={t("form.endTitle")}
                description={t("form.endDescription")}
                confirmLabel={t("actions.endPlan")}
                cancelLabel={t("actions.cancel")}
                pending={saving}
                destructive
                onConfirm={endPlan}
            />
            <ConfirmationDialog
                open={confirmRestart}
                onOpenChange={setConfirmRestart}
                title={t("form.restartTitle")}
                description={t("form.restartDescription")}
                confirmLabel={t("actions.startAgain")}
                cancelLabel={t("actions.cancel")}
                pending={saving}
                destructive
                onConfirm={() => save(true)}
            />
            <div className={cn("grid", plan && "md:grid-cols-[0.8fr_1.2fr]")}>
                <div className="flex flex-col bg-primary p-4 text-primary-foreground sm:p-5">
                    <div className="flex items-start gap-3 sm:gap-4">
                        <span
                            aria-hidden="true"
                            className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-foreground/15 sm:size-10"
                        >
                            <Sparkles className="size-5" />
                        </span>
                        <div className="min-w-0">
                            <h2 className="font-semibold leading-6">
                                {t("title")}
                            </h2>
                            <p className="mt-1 text-xs leading-5 text-primary-foreground/80 sm:text-sm sm:leading-6">
                                {t("description")}
                            </p>
                        </div>
                    </div>
                    {plan && (
                        <div className="mt-4 md:mt-auto md:pt-5">
                            <div className="flex items-end justify-between gap-4">
                                <span className="text-3xl font-semibold tabular-nums md:text-4xl">
                                    {plan.progressPercentage}%
                                </span>
                                <span className="text-xs text-primary-foreground/80">
                                    {t("summary.complete")}
                                </span>
                            </div>
                            <div
                                role="progressbar"
                                aria-label={t("summary.complete")}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-valuenow={plan.progressPercentage}
                                className="mt-2 h-1.5 overflow-hidden rounded-full bg-primary-foreground/20"
                            >
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

                {plan && (
                    <div className="app-card-body md:border-t-0 md:border-s">
                        <div className="grid gap-3 sm:grid-cols-3 sm:gap-5">
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
                                    unit: plan.measurement,
                                })}
                            />
                            <Summary
                                icon={CalendarDays}
                                label={t("summary.deadline")}
                                value={dateFormatter.format(
                                    new Date(`${plan.targetDate}T12:00:00Z`),
                                )}
                            />
                        </div>
                        <p className="mt-4 text-sm leading-6 text-muted-foreground">
                            {t("summary.adaptiveNote")}
                        </p>
                        {plan.repeatable && (
                            <p className="mt-2 flex items-start gap-2 text-xs leading-5 text-muted-foreground">
                                <Repeat2
                                    aria-hidden="true"
                                    className="mt-0.5 size-3.5 shrink-0"
                                />
                                {t("summary.repeats")}
                            </p>
                        )}
                    </div>
                )}
            </div>
            {plan && !editing && (
                <div className="flex flex-col gap-1 border-t border-border/50 bg-muted/20 p-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:p-4">
                    <div
                        className={cn(
                            "grid gap-2 sm:flex sm:flex-wrap",
                            !plan.completed && "grid-cols-2",
                        )}
                    >
                        {plan.completed ? (
                            <Button
                                className="min-h-11 h-auto whitespace-normal rounded-xl px-3 py-2 text-sm"
                                disabled={saving}
                                onClick={() => openEditor("restart")}
                            >
                                <RotateCcw
                                    aria-hidden="true"
                                    className="size-4 shrink-0"
                                />
                                {t("actions.startAgain")}
                            </Button>
                        ) : (
                            <Button
                                className="min-h-11 h-auto whitespace-normal rounded-xl px-3 py-2 text-sm"
                                disabled={saving}
                                onClick={() => openEditor("edit")}
                            >
                                <Pencil
                                    aria-hidden="true"
                                    className="size-4 shrink-0"
                                />
                                {t("actions.edit")}
                            </Button>
                        )}
                        {!plan.completed && (
                            <Button
                                variant="outline"
                                className="min-h-11 h-auto whitespace-normal rounded-xl px-3 py-2 text-sm"
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
                    <div className="flex flex-wrap items-center gap-1">
                        {!plan.completed && (
                            <Button
                                variant="ghost"
                                className="min-h-11 h-auto whitespace-normal rounded-lg px-2 text-xs text-muted-foreground hover:text-foreground"
                                disabled={saving}
                                onClick={() => openEditor("restart")}
                            >
                                <RotateCcw
                                    aria-hidden="true"
                                    className="size-3.5 shrink-0"
                                />
                                {t("actions.startAgain")}
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            className="min-h-11 h-auto whitespace-normal rounded-lg px-2 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            disabled={saving}
                            onClick={() => setConfirmEnd(true)}
                        >
                            <Trash2
                                aria-hidden="true"
                                className="size-3.5 shrink-0"
                            />
                            {t("actions.endPlan")}
                        </Button>
                    </div>
                </div>
            )}
            {editing && (
                <div className="app-card-body">
                    <form
                        onSubmit={(event) => {
                            event.preventDefault();
                            save();
                        }}
                        className="space-y-6"
                    >
                        <fieldset disabled={saving} className="space-y-6">
                            {mode === "edit" && (
                                <p className="text-sm leading-6 text-muted-foreground">
                                    {t("form.editHint")}
                                </p>
                            )}
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
                                {mode !== "edit" && (
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
                                )}
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
                                            aria-pressed={measurement === item}
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
                                        : mode === "restart"
                                          ? t("actions.startAgain")
                                          : plan
                                            ? t("form.update")
                                            : t("form.save")}
                                </Button>
                            </div>
                        </fieldset>
                    </form>
                </div>
            )}
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
        <div className="flex items-center justify-between gap-4 sm:block">
            <div className="flex items-center gap-2 sm:block">
                <Icon
                    className="size-4 shrink-0 text-primary"
                    aria-hidden="true"
                />
                <p className="text-xs text-muted-foreground sm:mt-2">{label}</p>
            </div>
            <p className="text-end text-sm font-semibold leading-5 sm:mt-1 sm:text-start sm:text-base">
                {value}
            </p>
        </div>
    );
}
