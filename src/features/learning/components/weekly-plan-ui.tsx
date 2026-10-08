"use client";

import {
    ArrowRight,
    BookOpen,
    CalendarDays,
    Check,
    ChevronRight,
    Globe2,
    LoaderCircle,
    Pause,
    Play,
    RefreshCw,
    SlidersHorizontal,
    Trash2,
} from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import { Input } from "@/components/ui/input";
import type { ScheduledRange } from "@/features/revision/schedule";
import { cn } from "@/lib/utils";

export type PlanKind = "revision" | "memorization";
export type PlanSurah = { number: number; name: string; englishName: string };
export const planInputClass =
    "h-12 w-full min-w-0 rounded-xl border border-border/40 bg-background/30 px-3 text-sm shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 dark:bg-background/30";

export function usePlanFormatting(surahs: PlanSurah[]) {
    const locale = useLocale();
    const t = useTranslations("Memorization.weekly");
    return {
        date: (value: string) =>
            new Date(`${value}T12:00:00Z`).toLocaleDateString(locale, {
                weekday: "long",
                month: "short",
                day: "numeric",
                timeZone: "UTC",
            }),
        range: (
            item: Pick<
                ScheduledRange,
                | "startSurahNumber"
                | "startAyahNumber"
                | "endSurahNumber"
                | "endAyahNumber"
            >,
        ) =>
            t("range", {
                start:
                    surahs.find((s) => s.number === item.startSurahNumber)?.[
                        locale === "ar" ? "name" : "englishName"
                    ] ?? item.startSurahNumber,
                startAyah: item.startAyahNumber,
                end:
                    surahs.find((s) => s.number === item.endSurahNumber)?.[
                        locale === "ar" ? "name" : "englishName"
                    ] ?? item.endSurahNumber,
                endAyah: item.endAyahNumber,
            }),
    };
}

export function PlanNavigation({ active }: { active: PlanKind }) {
    const t = useTranslations("Memorization.plans");
    return (
        <nav
            aria-label={t("navigation")}
            className="mt-6 grid grid-cols-2 gap-1 rounded-2xl border border-border/40 bg-card/40 p-1.5 sm:max-w-lg"
        >
            {(["revision", "memorization"] as const).map((kind) => {
                const Icon = kind === "revision" ? RefreshCw : BookOpen;
                return (
                    <Link
                        key={kind}
                        href={
                            kind === "revision"
                                ? "/memorization/revision"
                                : "/memorization/plan"
                        }
                        aria-current={active === kind ? "page" : undefined}
                        className={cn(
                            "flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-xl px-3 py-2 text-center text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            active === kind
                                ? "bg-primary/10 text-primary"
                                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                        )}
                    >
                        <Icon aria-hidden="true" className="size-4 shrink-0" />
                        {t(kind)}
                    </Link>
                );
            })}
        </nav>
    );
}

export function PlanSetupNotice() {
    const t = useTranslations("Memorization.plans");
    return (
        <section className="rounded-3xl border border-primary/20 bg-primary/[0.04] p-5 sm:p-6">
            <h2 className="font-semibold">{t("setupTitle")}</h2>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
                {t("setupHint")}
            </p>
            <Button asChild className="mt-4 min-h-11">
                <Link href="/memorization">{t("setupAction")}</Link>
            </Button>
        </section>
    );
}

export function PlanOverview({
    title,
    description,
    plan,
    week,
    done,
    total,
    editing,
    pending,
    onEdit,
    onPause,
    onRegenerate,
    onDelete,
    version,
    notice,
}: {
    title: string;
    description: string;
    plan: { enabled: boolean } | null;
    week: {
        weekStart: string;
        riwayah: "hafs" | "warsh";
        timezone: string;
    } | null;
    done: number;
    total: number;
    editing: boolean;
    pending: boolean;
    onEdit: () => void;
    onPause: () => void;
    onRegenerate: () => void;
    onDelete: (version: string) => Promise<boolean | undefined>;
    version: string;
    notice?: string;
}) {
    const t = useTranslations("Memorization.plans");
    const weekly = useTranslations("Memorization.weekly");
    const { date } = usePlanFormatting([]);
    const [deleteVersion, setDeleteVersion] = useState<string | null>(null);
    return (
        <section className="overflow-hidden rounded-3xl border border-border/45 bg-card/50 p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/[0.08] text-primary">
                        <CalendarDays aria-hidden="true" className="size-5" />
                    </span>
                    <div>
                        <h2 className="text-lg font-semibold">{title}</h2>
                        <p className="mt-1 text-xs font-medium text-muted-foreground">
                            {t(
                                !plan
                                    ? "notEnabled"
                                    : plan.enabled
                                      ? "active"
                                      : "paused",
                            )}
                        </p>
                    </div>
                </div>
                {plan && (
                    <div className="flex flex-wrap gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            disabled={pending}
                            onClick={onEdit}
                            className="min-h-11"
                        >
                            {!plan.enabled && !editing ? (
                                <Play aria-hidden="true" />
                            ) : (
                                <SlidersHorizontal aria-hidden="true" />
                            )}
                            {t(
                                editing
                                    ? "cancel"
                                    : plan.enabled
                                      ? "settings"
                                      : "resume",
                            )}
                        </Button>
                        {plan.enabled && (
                            <Button
                                type="button"
                                variant="ghost"
                                disabled={pending}
                                onClick={onPause}
                                className="min-h-11"
                            >
                                <Pause aria-hidden="true" />
                                {t("pause")}
                            </Button>
                        )}
                        <Button
                            type="button"
                            variant="outline"
                            disabled={pending}
                            onClick={onRegenerate}
                            className="min-h-11"
                        >
                            <RefreshCw aria-hidden="true" />
                            {t("regenerate")}
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            disabled={pending}
                            onClick={() => setDeleteVersion(version)}
                            className="min-h-11 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                            <Trash2 aria-hidden="true" />
                            {t("delete")}
                        </Button>
                    </div>
                )}
            </div>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground">
                {plan && !plan.enabled ? t("pauseHint") : description}
            </p>
            {week && (
                <div className="mt-5 space-y-4 border-t border-border/35 pt-4">
                    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
                        <span>
                            {weekly("weekOf", { date: date(week.weekStart) })}
                        </span>
                        <span>{weekly(week.riwayah)}</span>
                        <bdi>{week.timezone}</bdi>
                    </div>
                    {total > 0 && (
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                            <div
                                role="progressbar"
                                aria-label={t("progress")}
                                aria-valuenow={done}
                                aria-valuemin={0}
                                aria-valuemax={total}
                                className="h-2 min-w-24 flex-1 overflow-hidden rounded-full bg-primary/10"
                            >
                                <div
                                    className="h-full rounded-full bg-primary transition-[width]"
                                    style={{
                                        width: `${(100 * done) / total}%`,
                                    }}
                                />
                            </div>
                            <p className="text-sm font-medium tabular-nums">
                                {t("completed", { done, total })}
                            </p>
                        </div>
                    )}
                </div>
            )}
            {notice && (
                <p className="mt-4 rounded-xl border border-border/40 bg-background/30 p-3 text-sm leading-7 text-muted-foreground">
                    {notice}
                </p>
            )}
            <ConfirmationDialog
                open={deleteVersion !== null}
                onOpenChange={(open) => {
                    if (!open) setDeleteVersion(null);
                }}
                title={t("deleteTitle")}
                description={t("deleteHint")}
                confirmLabel={t("delete")}
                cancelLabel={t("cancelAction")}
                pending={pending}
                destructive
                onConfirm={async () => {
                    if (deleteVersion && (await onDelete(deleteVersion)))
                        setDeleteVersion(null);
                }}
            />
        </section>
    );
}

export function PlanStudyDays({ days }: { days: number[] }) {
    const t = useTranslations("Memorization.plans");
    const weekly = useTranslations("Memorization.weekly");
    return (
        <div className="rounded-2xl border border-border/40 bg-background/20 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">{t("savedDays")}</p>
                <Link
                    href="#study-schedule"
                    className="inline-flex min-h-11 items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline"
                >
                    {t("editDays")}
                    <ChevronRight
                        aria-hidden="true"
                        className="size-3.5 rtl:rotate-180"
                    />
                </Link>
            </div>
            <p className="text-sm leading-7 text-muted-foreground">
                {days.length
                    ? days.map((day) => weekly(`day${day}`)).join(" · ")
                    : t("chooseDays")}
            </p>
        </div>
    );
}

export function PlanReadingFields({
    kind,
    riwayah,
    timezone,
    onChange,
}: {
    kind: PlanKind;
    riwayah: "hafs" | "warsh";
    timezone: string;
    onChange: (
        value: Partial<{ riwayah: "hafs" | "warsh"; timezone: string }>,
    ) => void;
}) {
    const t = useTranslations("Memorization.weekly");
    return (
        <div className="grid gap-5 border-t border-border/35 pt-5 sm:grid-cols-2">
            <fieldset>
                <legend className="mb-2.5 text-sm font-medium">
                    {t("editor.reading")}
                </legend>
                <div className="grid grid-cols-2 gap-1 rounded-xl border border-border/40 bg-background/30 p-1">
                    {(["hafs", "warsh"] as const).map((value) => (
                        <label key={value} className="cursor-pointer">
                            <input
                                type="radio"
                                name={`${kind}-reading`}
                                value={value}
                                checked={riwayah === value}
                                onChange={() => onChange({ riwayah: value })}
                                className="peer sr-only"
                            />
                            <span className="flex min-h-10 items-center justify-center rounded-lg text-sm text-muted-foreground transition-colors peer-checked:bg-primary/10 peer-checked:font-medium peer-checked:text-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-disabled:opacity-60">
                                {t(value)}
                            </span>
                        </label>
                    ))}
                </div>
            </fieldset>
            <div>
                <label
                    htmlFor={`${kind}-timezone`}
                    className="mb-2.5 block text-sm font-medium"
                >
                    {t("timezone")}
                </label>
                <div className="relative" dir="ltr">
                    <Globe2
                        aria-hidden="true"
                        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input
                        id={`${kind}-timezone`}
                        required
                        value={timezone}
                        onChange={(e) => onChange({ timezone: e.target.value })}
                        placeholder="Africa/Casablanca"
                        className={cn(planInputClass, "pr-10")}
                    />
                </div>
            </div>
        </div>
    );
}

export function PlanAmountChoices({
    kind,
    amount,
    onChange,
}: {
    kind: PlanKind;
    amount: number;
    onChange: (amount: number) => void;
}) {
    const t = useTranslations("Memorization.weekly");
    return (
        <div className="grid grid-cols-3 gap-2.5">
            {[1, 2, 4].map((value) => (
                <label key={value} className="min-w-0 cursor-pointer">
                    <input
                        type="radio"
                        name={`${kind}-amount`}
                        value={value}
                        checked={amount === value}
                        onChange={() => onChange(value)}
                        className="peer sr-only"
                    />
                    <span className="flex h-full min-h-24 flex-col items-center justify-center gap-3 rounded-2xl border border-border/40 bg-background/30 px-2 py-4 text-center text-xs text-muted-foreground transition-colors hover:border-primary/30 peer-checked:border-primary/40 peer-checked:bg-primary/[0.08] peer-checked:font-semibold peer-checked:text-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-disabled:opacity-60 sm:text-sm">
                        <span aria-hidden="true" className="flex gap-1">
                            {[1, 2, 3, 4].map((q) => (
                                <span
                                    key={q}
                                    className={cn(
                                        "h-5 w-2 rounded-full",
                                        q <= value
                                            ? "bg-current"
                                            : "bg-primary/10",
                                    )}
                                />
                            ))}
                        </span>
                        {t(`amount${value}`)}
                    </span>
                </label>
            ))}
        </div>
    );
}

export function PlanEditor({
    kind,
    intro,
    days,
    amount,
    amountLabel,
    summaryHint,
    riwayah,
    pending,
    hasPlan,
    regenerating = false,
    canPreview = true,
    onPreview,
    onCancel,
    children,
}: {
    kind: PlanKind;
    intro: string;
    days: number[];
    amount: number;
    amountLabel: string;
    summaryHint: string;
    riwayah: "hafs" | "warsh";
    pending: boolean;
    hasPlan: boolean;
    regenerating?: boolean;
    canPreview?: boolean;
    onPreview: () => void;
    onCancel: () => void;
    children: ReactNode;
}) {
    const t = useTranslations("Memorization.plans");
    const weekly = useTranslations("Memorization.weekly");
    const locale = useLocale();
    const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                if (!pending && days.length && canPreview) onPreview();
            }}
            className="grid items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(17rem,1fr)]"
        >
            <section
                aria-labelledby={`${kind}-settings-title`}
                className="min-w-0 overflow-hidden rounded-3xl border border-border/45 bg-card/50"
            >
                <div className="flex items-start gap-3 border-b border-border/35 p-5 sm:px-6">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/[0.08] text-primary">
                        <SlidersHorizontal
                            aria-hidden="true"
                            className="size-5"
                        />
                    </span>
                    <div>
                        <h2
                            id={`${kind}-settings-title`}
                            className="font-semibold"
                        >
                            {t(regenerating ? "regenerate" : "settings")}
                        </h2>
                        <p className="mt-1 text-xs leading-6 text-muted-foreground">
                            {intro}
                        </p>
                    </div>
                </div>
                <fieldset
                    disabled={pending}
                    className="min-w-0 space-y-6 p-5 sm:p-6"
                >
                    <legend className="sr-only">{t("settings")}</legend>
                    <PlanStudyDays days={days} />
                    {children}
                </fieldset>
            </section>
            <aside
                aria-labelledby={`${kind}-summary-title`}
                className="min-w-0 rounded-3xl border border-primary/20 bg-primary/[0.04] p-5 sm:p-6 lg:sticky lg:top-24"
            >
                <h2
                    id={`${kind}-summary-title`}
                    className="flex items-center gap-2 text-sm font-semibold"
                >
                    <CalendarDays
                        aria-hidden="true"
                        className="size-4 text-primary"
                    />
                    {t("summary")}
                </h2>
                <div className="my-5 grid grid-cols-2 divide-x divide-border/40 rtl:divide-x-reverse">
                    <div className="pe-4">
                        <p className="text-3xl font-semibold text-primary tabular-nums">
                            {number.format(days.length)}
                        </p>
                        <p className="mt-1 text-xs leading-6 text-muted-foreground">
                            {t("daysPerWeek")}
                        </p>
                    </div>
                    <div className="ps-4">
                        <p className="text-3xl font-semibold text-primary tabular-nums">
                            {number.format(amount)}
                        </p>
                        <p className="mt-1 text-xs leading-6 text-muted-foreground">
                            {amountLabel}
                        </p>
                    </div>
                </div>
                <p className="text-xs leading-6 text-muted-foreground">
                    {summaryHint}
                </p>
                <p className="mt-4 flex items-center gap-2 border-t border-primary/15 pt-4 text-xs text-muted-foreground">
                    <BookOpen aria-hidden="true" className="size-4" />
                    {weekly(riwayah)}
                </p>
                <p className="my-5 text-xs leading-6 text-muted-foreground">
                    {t(
                        regenerating
                            ? "regenerateHint"
                            : hasPlan
                              ? "changesHint"
                              : "previewHint",
                    )}
                </p>
                {!days.length && (
                    <p className="mb-3 text-xs leading-6 text-primary">
                        {t("chooseDays")}
                    </p>
                )}
                <Button
                    type="submit"
                    disabled={pending || !days.length || !canPreview}
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
                        type="button"
                        variant="ghost"
                        disabled={pending}
                        onClick={onCancel}
                        className="mt-2 min-h-11 w-full"
                    >
                        {t("cancel")}
                    </Button>
                )}
            </aside>
        </form>
    );
}

export function PlanPreview({
    kind,
    preview,
    surahs,
    emptyMessage,
    hint,
    pending,
    enabled,
    hasPlan,
    onSave,
}: {
    kind: PlanKind;
    preview: {
        regenerate?: boolean;
        nextWeek: boolean;
        ready: boolean;
        weekStart: string;
        sessions: ScheduledRange[];
    };
    surahs: PlanSurah[];
    emptyMessage: string;
    hint: string;
    pending: boolean;
    enabled: boolean;
    hasPlan: boolean;
    onSave: () => void;
}) {
    const t = useTranslations("Memorization.plans");
    const weekly = useTranslations("Memorization.weekly");
    const { date, range } = usePlanFormatting(surahs);
    const panel = useRef<HTMLElement>(null);
    useEffect(() => {
        panel.current?.focus({ preventScroll: true });
        panel.current?.scrollIntoView({
            block: "start",
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
                .matches
                ? "instant"
                : "smooth",
        });
    }, []);
    return (
        <section
            ref={panel}
            tabIndex={-1}
            aria-labelledby={`${kind}-preview-title`}
            aria-live="polite"
            className="scroll-mt-24 rounded-3xl border border-primary/25 bg-primary/[0.04] p-5 outline-none sm:p-6"
        >
            <p className="text-xs font-medium text-primary">{t("preview")}</p>
            <h2
                id={`${kind}-preview-title`}
                className="mt-1 text-lg font-semibold"
            >
                {preview.regenerate
                    ? t("regeneratePreview")
                    : weekly(
                          preview.nextWeek ? "nextPreview" : "currentPreview",
                      )}
            </h2>
            <p className="mt-2 text-xs text-muted-foreground">
                {weekly("weekOf", { date: date(preview.weekStart) })}
            </p>
            {preview.regenerate && (
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    {t("regenerateCount", {
                        count: preview.sessions.length,
                        days: new Set(
                            preview.sessions.map((s) => s.scheduledDate),
                        ).size,
                    })}
                </p>
            )}
            {preview.sessions.length ? (
                <ol className="mt-5 grid gap-3 sm:grid-cols-2">
                    {preview.sessions.map((item) => (
                        <li
                            key={item.ordinal}
                            className="rounded-2xl border border-border/40 bg-background/30 p-4"
                        >
                            <p className="text-xs font-medium text-muted-foreground">
                                {date(item.scheduledDate)}
                            </p>
                            <p className="mt-2 text-sm leading-7">
                                {range(item)}
                            </p>
                        </li>
                    ))}
                </ol>
            ) : (
                <p className="mt-5 rounded-2xl border border-border/40 bg-background/20 p-4 text-sm leading-7 text-muted-foreground">
                    {emptyMessage}
                </p>
            )}
            <div className="mt-5 flex flex-col gap-4 border-t border-primary/15 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-2xl text-xs leading-6 text-muted-foreground">
                    {preview.regenerate ? t("regenerateHint") : hint}
                </p>
                <Button
                    type="button"
                    disabled={
                        pending ||
                        !preview.ready ||
                        (preview.regenerate && !preview.sessions.length)
                    }
                    onClick={onSave}
                    className="min-h-11 shrink-0"
                >
                    {pending && (
                        <LoaderCircle
                            aria-hidden="true"
                            className="size-4 animate-spin"
                        />
                    )}
                    {t(
                        preview.regenerate
                            ? "regenerateConfirm"
                            : enabled
                              ? "save"
                              : hasPlan
                                ? "resume"
                                : "enable",
                    )}
                </Button>
            </div>
        </section>
    );
}

export type PlanSessionItem = {
    id: string;
    scheduledDate: string | null;
    originalScheduledDate?: string;
    range: string;
    amount?: string;
    state: "ready" | "complete" | "difficult" | "unavailable" | "paused";
    description: string;
    coverage?: string;
    href?: string;
    action?: string;
};
export function PlanSessions({
    items,
    today,
    emptyMessage,
}: {
    items: PlanSessionItem[];
    today: string;
    emptyMessage: string;
}) {
    const t = useTranslations("Memorization.plans");
    const plansT = useTranslations("Plans");
    const { date } = usePlanFormatting([]);
    const canOpen = (item: PlanSessionItem) =>
        item.state === "ready" &&
        item.scheduledDate === today &&
        Boolean(item.href);
    const days = [...new Set(items.map((item) => item.scheduledDate))].sort(
        (a, b) => (a ?? "9999").localeCompare(b ?? "9999"),
    );
    return (
        <section className="space-y-4" aria-label={t("sessions")}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
                <h2 className="text-lg font-semibold">{t("sessions")}</h2>
                {items.some(canOpen) && (
                    <p className="text-sm text-muted-foreground">
                        {t("sessionsHint")}
                    </p>
                )}
            </div>
            {!items.length && (
                <p className="rounded-2xl border border-dashed border-border/60 bg-card/30 p-5 text-sm leading-7 text-muted-foreground">
                    {emptyMessage}
                </p>
            )}
            <ol className="space-y-4">
                {days.map((day) => (
                    <li
                        key={day ?? "unscheduled"}
                        className="grid gap-2.5 md:grid-cols-[10rem_minmax(0,1fr)] md:gap-5"
                    >
                        <div className="flex items-start gap-2.5 py-1 md:pt-5">
                            <span
                                aria-hidden="true"
                                className={cn(
                                    "mt-1.5 size-2 shrink-0 rounded-full",
                                    day === today
                                        ? "bg-primary ring-4 ring-primary/10"
                                        : "bg-muted-foreground/35",
                                )}
                            />
                            <h3
                                className={cn(
                                    "text-sm font-medium leading-6",
                                    day === today
                                        ? "text-primary"
                                        : "text-muted-foreground",
                                )}
                            >
                                {day ? (
                                    <time dateTime={day}>{date(day)}</time>
                                ) : (
                                    t("unscheduled")
                                )}
                            </h3>
                        </div>
                        <ul className="min-w-0 space-y-2.5">
                            {items
                                .filter((item) => item.scheduledDate === day)
                                .map((item) => {
                                    const active = canOpen(item);
                                    const done =
                                        item.state === "complete" ||
                                        item.state === "difficult";
                                    const status =
                                        item.state === "ready"
                                            ? day === null
                                                ? "unscheduled"
                                                : day < today
                                                  ? "overdue"
                                                  : day === today
                                                    ? "today"
                                                    : "upcoming"
                                            : item.state;
                                    const Icon = done
                                        ? Check
                                        : item.state === "paused"
                                          ? Pause
                                          : BookOpen;
                                    const action = plansT("goToToday");
                                    return (
                                        <li key={item.id}>
                                            <article
                                                className={cn(
                                                    "group relative rounded-2xl border p-4 transition-colors sm:p-5",
                                                    active
                                                        ? "border-primary/40 bg-primary/[0.06] shadow-sm hover:border-primary/70 hover:bg-primary/10"
                                                        : "border-border/40 bg-card/40",
                                                )}
                                            >
                                                <div className="flex items-start gap-3 sm:gap-4">
                                                    <span
                                                        className={cn(
                                                            "flex size-10 shrink-0 items-center justify-center rounded-xl",
                                                            active
                                                                ? "bg-primary/15 text-primary"
                                                                : "bg-muted/50 text-muted-foreground",
                                                        )}
                                                    >
                                                        <Icon
                                                            aria-hidden="true"
                                                            className="size-4"
                                                        />
                                                    </span>
                                                    <div className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between sm:gap-5">
                                                        <div className="min-w-0">
                                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
                                                                <span
                                                                    className={cn(
                                                                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium",
                                                                        item.state ===
                                                                            "difficult"
                                                                            ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                                                                            : active
                                                                              ? "bg-primary/15 text-primary"
                                                                              : done
                                                                                ? "bg-primary/10 text-primary"
                                                                                : "bg-muted/60 text-muted-foreground",
                                                                    )}
                                                                >
                                                                    {done && (
                                                                        <Check
                                                                            aria-hidden="true"
                                                                            className="size-3"
                                                                        />
                                                                    )}
                                                                    {t(status)}
                                                                </span>
                                                                {item.amount && (
                                                                    <span className="text-muted-foreground">
                                                                        {
                                                                            item.amount
                                                                        }
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <h4 className="mt-2 text-balance break-words font-semibold leading-7">
                                                                {active &&
                                                                item.href ? (
                                                                    <Link
                                                                        href="/plans/today"
                                                                        className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-offset-2 focus-visible:after:ring-offset-background"
                                                                    >
                                                                        {
                                                                            item.range
                                                                        }
                                                                        <span className="sr-only">
                                                                            {" "}
                                                                            —{" "}
                                                                            {
                                                                                action
                                                                            }
                                                                        </span>
                                                                    </Link>
                                                                ) : (
                                                                    item.range
                                                                )}
                                                            </h4>
                                                            {(done ||
                                                                item.state ===
                                                                    "unavailable" ||
                                                                !day) && (
                                                                <p className="mt-1 text-xs leading-6 text-muted-foreground">
                                                                    {
                                                                        item.description
                                                                    }
                                                                </p>
                                                            )}
                                                            {item.coverage && (
                                                                <p className="mt-1 text-xs leading-6 text-muted-foreground">
                                                                    {
                                                                        item.coverage
                                                                    }
                                                                </p>
                                                            )}
                                                            {day &&
                                                                item.originalScheduledDate &&
                                                                item.originalScheduledDate !==
                                                                    day && (
                                                                    <p className="mt-1 text-xs leading-6 text-muted-foreground">
                                                                        {t(
                                                                            "carriedFrom",
                                                                            {
                                                                                date: date(
                                                                                    item.originalScheduledDate,
                                                                                ),
                                                                            },
                                                                        )}
                                                                    </p>
                                                                )}
                                                        </div>
                                                        {active && (
                                                            <span
                                                                aria-hidden="true"
                                                                className="mt-3 inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-primary sm:mt-0"
                                                            >
                                                                {action}
                                                                <ArrowRight className="size-4 transition-transform motion-reduce:transition-none group-hover:ltr:translate-x-1 group-hover:rtl:-translate-x-1 rtl:rotate-180" />
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </article>
                                        </li>
                                    );
                                })}
                        </ul>
                    </li>
                ))}
            </ol>
        </section>
    );
}
