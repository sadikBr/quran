"use client";
import {
    BookMarked,
    BookOpen,
    CalendarDays,
    Plus,
    RefreshCcw,
    X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Dialog } from "radix-ui";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
    type RecurringPlan,
    type RecurringSettings,
    type RecurringState,
    recurringSettingsFromForm,
} from "../recurrence";
import { savePersonalPlan, setPersonalPlanState } from "../server/actions";
import type { SurahOption } from "./today-tasks";

export type BuiltinPlan = {
    kind: "reading" | "memorization" | "revision";
    enabled: boolean;
    href: string;
};
type Editor = {
    id: string;
    revision: number | null;
    settings: RecurringSettings;
};
const allDays = [1, 2, 3, 4, 5, 6, 7];
const field =
    "min-h-11 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default function PlansManager({
    state,
    builtins,
    timezone,
    surahs,
    initiallyOpen,
}: {
    state: RecurringState;
    builtins: BuiltinPlan[];
    timezone: string;
    surahs: SurahOption[];
    initiallyOpen: boolean;
}) {
    const t = useTranslations("Plans"),
        locale = useLocale(),
        router = useRouter();
    const prefix = useId();
    const [open, setOpen] = useState(initiallyOpen);
    const [reading, setReading] = useState(false);
    const [editor, setEditor] = useState<Editor | null>(null);
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [archive, setArchive] = useState<RecurringPlan | null>(null);
    const [showArchived, setShowArchived] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const dayName = (day: number, long = false) =>
        new Intl.DateTimeFormat(locale, {
            weekday: long ? "long" : "short",
            timeZone: "UTC",
        }).format(new Date(Date.UTC(2024, 0, day)));
    const schedule = (plan: RecurringPlan) =>
        plan.days.length === 7
            ? t("everyDay")
            : plan.days.map((day) => dayName(day)).join(" · ");
    function create(template?: "kahf" | "mulk" | "tafsir", passage = false) {
        setError(null);
        setReading(false);
        setEditor({
            id: crypto.randomUUID(),
            revision: null,
            settings: {
                title: template ? t(`templates.${template}.title`) : "",
                notes: "",
                timezone,
                days:
                    template === "kahf"
                        ? [5]
                        : template === "tafsir"
                          ? [6]
                          : allDays,
                minutes: template === "tafsir" ? 30 : 15,
                reminderTime: null,
                surahNumber:
                    template === "kahf"
                        ? 18
                        : template === "mulk"
                          ? 67
                          : passage
                            ? 1
                            : null,
                resourceUrl: null,
            },
        });
        setOpen(true);
    }
    function edit(plan: RecurringPlan) {
        const {
            title,
            notes,
            days,
            timezone,
            minutes,
            reminderTime,
            surahNumber,
            resourceUrl,
        } = plan;
        setEditor({
            id: plan.id,
            revision: plan.revision,
            settings: {
                title,
                notes,
                days,
                timezone,
                minutes,
                reminderTime,
                surahNumber,
                resourceUrl,
            },
        });
        setError(null);
        setOpen(true);
    }
    function change<K extends keyof RecurringSettings>(
        key: K,
        value: RecurringSettings[K],
    ) {
        setEditor((current) =>
            current
                ? {
                      ...current,
                      settings: { ...current.settings, [key]: value },
                  }
                : current,
        );
    }
    function close() {
        setOpen(false);
        setEditor(null);
        setReading(false);
        setError(null);
    }
    function save(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!editor) return;
        const parsed = recurringSettingsFromForm(
            new FormData(event.currentTarget),
        );
        if (!parsed.success) {
            setError(t("errors.invalid"));
            return;
        }
        setEditor({ ...editor, settings: parsed.data });
        startTransition(async () => {
            try {
                const result = await savePersonalPlan({
                    ...editor,
                    settings: parsed.data,
                });
                if (!result.success) {
                    setError(t(`errors.${result.reason}`));
                    return;
                }
                toast.success(t("saved"));
                close();
                router.refresh();
            } catch {
                setError(t("errors.failed"));
            }
        });
    }
    function setState(
        plan: RecurringPlan,
        action: "pause" | "resume" | "archive",
    ) {
        startTransition(async () => {
            try {
                const result = await setPersonalPlanState({
                    id: plan.id,
                    revision: plan.revision,
                    action,
                });
                if (!result.success) toast.error(t(`errors.${result.reason}`));
                setArchive(null);
                router.refresh();
            } catch {
                toast.error(t("errors.failed"));
            }
        });
    }
    const regular = state.plans.filter((plan) => !plan.archived);
    const archived = state.plans.filter((plan) => plan.archived);
    const icons = {
        reading: BookOpen,
        memorization: BookMarked,
        revision: RefreshCcw,
    };
    const creationLinks = {
        reading: "/wird",
        memorization: "/memorization/plan",
        revision: "/memorization/revision",
    };
    return (
        <div className="space-y-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-semibold">{t("myPlans")}</h2>
                <Button
                    onClick={() => {
                        setEditor(null);
                        setReading(false);
                        setOpen(true);
                    }}
                >
                    <Plus className="size-4" />
                    {t("create")}
                </Button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
                    {t("manageHint")}
                </p>
                <Button asChild variant="outline">
                    <Link href="/plans/today">{t("goToToday")}</Link>
                </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {builtins.map((plan) => {
                    const Icon = icons[plan.kind];
                    return (
                        <article
                            key={plan.kind}
                            className="app-card flex flex-col gap-3 p-5"
                        >
                            <Icon className="size-6 text-primary" />
                            <h3 className="text-lg font-semibold">
                                {t(`types.${plan.kind}`)}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                {t(`typeHints.${plan.kind}`)}
                            </p>
                            <p className="text-xs font-semibold text-primary">
                                {t(plan.enabled ? "active" : "paused")}
                            </p>
                            <Button
                                variant="outline"
                                asChild
                                className="mt-auto"
                            >
                                <Link href={plan.href}>{t("manage")}</Link>
                            </Button>
                        </article>
                    );
                })}
                {regular.map((plan) => (
                    <article
                        key={plan.id}
                        className="app-card flex min-w-0 flex-col gap-3 p-5"
                    >
                        <div className="flex items-center justify-between gap-2">
                            <CalendarDays className="size-6 text-primary" />
                            <span className="text-xs font-semibold text-primary">
                                {t(plan.enabled ? "active" : "paused")}
                            </span>
                        </div>
                        <h3 className="break-words text-lg font-semibold">
                            {plan.title}
                        </h3>
                        {plan.notes && (
                            <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">
                                {plan.notes}
                            </p>
                        )}
                        <p className="text-sm">
                            {schedule(plan)} ·{" "}
                            {t("minutes", { count: plan.minutes })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {plan.timezone}
                            {plan.reminderTime ? ` · ${plan.reminderTime}` : ""}
                        </p>
                        <div className="mt-auto flex flex-wrap gap-2 pt-2">
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={pending}
                                onClick={() => edit(plan)}
                            >
                                {t("edit")}
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                disabled={pending}
                                onClick={() =>
                                    setState(
                                        plan,
                                        plan.enabled ? "pause" : "resume",
                                    )
                                }
                            >
                                {t(plan.enabled ? "pause" : "resume")}
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                disabled={pending}
                                onClick={() => setArchive(plan)}
                            >
                                {t("archive")}
                            </Button>
                        </div>
                    </article>
                ))}
            </div>
            {!builtins.length && !regular.length && (
                <p className="rounded-xl border border-dashed p-6 text-center text-muted-foreground">
                    {t("empty")}
                </p>
            )}
            <section className="space-y-3">
                <h3 className="font-semibold">{t("templatesTitle")}</h3>
                <div className="grid gap-3 sm:grid-cols-3">
                    {(["kahf", "mulk", "tafsir"] as const).map((template) => (
                        <button
                            key={template}
                            type="button"
                            onClick={() => create(template)}
                            className="app-card min-h-24 p-4 text-start transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <span className="block font-semibold">
                                {t(`templates.${template}.title`)}
                            </span>
                            <span className="mt-1 block text-sm text-muted-foreground">
                                {t(`templates.${template}.hint`)}
                            </span>
                        </button>
                    ))}
                </div>
            </section>
            <section className="app-card flex flex-wrap items-center justify-between gap-4 p-5">
                <div>
                    <h3 className="font-semibold">{t("personalPractice")}</h3>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {t("personalPracticeHint")}
                    </p>
                </div>
                <Button asChild variant="outline">
                    <Link href="/practice">{t("manage")}</Link>
                </Button>
            </section>
            <Link
                href="/memorization"
                className="inline-flex min-h-11 items-center text-sm font-semibold text-primary"
            >
                {t("memorizationProgress")}
            </Link>
            <section className="space-y-3">
                <Button
                    variant="ghost"
                    aria-expanded={showHistory}
                    onClick={() => setShowHistory(!showHistory)}
                >
                    {t("history")}
                </Button>
                {showHistory && (
                    <div className="app-card divide-y px-5">
                        {state.occurrences.length ? (
                            state.occurrences.map((item) => (
                                <div
                                    key={`${item.planId}:${item.localDate}`}
                                    className="flex flex-wrap items-center justify-between gap-2 py-4"
                                >
                                    <div>
                                        <p className="break-words font-medium">
                                            {item.snapshot.title}
                                        </p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {new Intl.DateTimeFormat(locale, {
                                                dateStyle: "medium",
                                                timeZone: "UTC",
                                            }).format(
                                                new Date(
                                                    `${item.localDate}T12:00:00Z`,
                                                ),
                                            )}{" "}
                                            · {item.snapshot.timezone}
                                        </p>
                                    </div>
                                    <span className="text-sm text-primary">
                                        {t(item.status)}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <p className="py-5 text-sm text-muted-foreground">
                                {t("historyEmpty")}
                            </p>
                        )}
                        <p className="py-4 text-xs text-muted-foreground">
                            {t("historyHint")}
                        </p>
                    </div>
                )}
            </section>
            {archived.length > 0 && (
                <section className="space-y-3">
                    <Button
                        variant="ghost"
                        aria-expanded={showArchived}
                        onClick={() => setShowArchived(!showArchived)}
                    >
                        {t("archived")}
                    </Button>
                    {showArchived && (
                        <div className="app-card space-y-3 p-5">
                            {archived.map((plan) => (
                                <p
                                    key={plan.id}
                                    className="break-words text-sm text-muted-foreground"
                                >
                                    {plan.title}
                                </p>
                            ))}
                        </div>
                    )}
                </section>
            )}
            <Dialog.Root
                open={open}
                onOpenChange={(value) => {
                    if (pending) return;
                    if (!value) close();
                    else setOpen(true);
                }}
            >
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
                    <Dialog.Content
                        dir={locale === "ar" ? "rtl" : "ltr"}
                        className={cn(
                            "fixed inset-x-3 top-[5dvh] z-50 mx-auto max-h-[90dvh] max-w-xl overflow-y-auto rounded-2xl border bg-background p-5 shadow-xl sm:p-6",
                            locale === "ar" && "arabic-ui",
                        )}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <Dialog.Title className="text-xl font-semibold">
                                {t(editor?.revision ? "edit" : "create")}
                            </Dialog.Title>
                            <Dialog.Close
                                disabled={pending}
                                className="flex size-10 shrink-0 items-center justify-center rounded-lg hover:bg-muted"
                                aria-label={t("close")}
                            >
                                <X className="size-5" />
                            </Dialog.Close>
                        </div>
                        <Dialog.Description className="mt-2 text-sm leading-6 text-muted-foreground">
                            {t(editor ? "formHint" : "chooseType")}
                        </Dialog.Description>
                        {!editor ? (
                            <div className="mt-5 space-y-3">
                                {reading ? (
                                    <>
                                        <Button
                                            variant="outline"
                                            className="min-h-16 w-full justify-start"
                                            asChild
                                        >
                                            <Link href="/wird">
                                                {t("continuousReading")}
                                            </Link>
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="min-h-16 w-full justify-start"
                                            onClick={() =>
                                                create(undefined, true)
                                            }
                                        >
                                            {t("repeatSurah")}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            onClick={() => setReading(false)}
                                        >
                                            {t("back")}
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        {(
                                            [
                                                "reading",
                                                "memorization",
                                                "revision",
                                            ] as const
                                        ).map((kind) =>
                                            kind === "reading" ? (
                                                <Button
                                                    key={kind}
                                                    variant="outline"
                                                    className="min-h-16 w-full justify-start"
                                                    onClick={() =>
                                                        setReading(true)
                                                    }
                                                >
                                                    <BookOpen className="size-5" />
                                                    {t(`types.${kind}`)}
                                                </Button>
                                            ) : (
                                                <Button
                                                    key={kind}
                                                    variant="outline"
                                                    className="min-h-16 w-full justify-start"
                                                    asChild
                                                >
                                                    <Link
                                                        href={
                                                            creationLinks[kind]
                                                        }
                                                    >
                                                        {t(`types.${kind}`)}
                                                    </Link>
                                                </Button>
                                            ),
                                        )}
                                        <Button
                                            variant="outline"
                                            className="min-h-16 w-full justify-start"
                                            onClick={() => create()}
                                        >
                                            <CalendarDays className="size-5" />
                                            {t("types.custom")}
                                        </Button>
                                        <Button
                                            asChild
                                            variant="ghost"
                                            className="min-h-11 w-full justify-start"
                                        >
                                            <Link href="/practice#practice-range">
                                                {t("personalPractice")}
                                            </Link>
                                        </Button>
                                    </>
                                )}
                            </div>
                        ) : (
                            <form onSubmit={save} className="mt-5 space-y-4">
                                <fieldset
                                    disabled={pending}
                                    className="space-y-4"
                                >
                                    <div className="space-y-1.5">
                                        <label
                                            htmlFor={`${prefix}-title`}
                                            className="text-sm font-medium"
                                        >
                                            {t("name")}
                                        </label>
                                        <input
                                            name="title"
                                            id={`${prefix}-title`}
                                            className={field}
                                            required
                                            maxLength={120}
                                            value={editor.settings.title}
                                            onChange={(e) =>
                                                change("title", e.target.value)
                                            }
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label
                                            htmlFor={`${prefix}-notes`}
                                            className="text-sm font-medium"
                                        >
                                            {t("notes")}
                                        </label>
                                        <textarea
                                            name="notes"
                                            id={`${prefix}-notes`}
                                            className={field}
                                            rows={3}
                                            maxLength={2000}
                                            value={editor.settings.notes}
                                            onChange={(e) =>
                                                change("notes", e.target.value)
                                            }
                                        />
                                    </div>
                                    <fieldset className="space-y-2">
                                        <legend className="text-sm font-medium">
                                            {t("repeat")}
                                        </legend>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                change("days", allDays)
                                            }
                                        >
                                            {t("everyDay")}
                                        </Button>
                                        <div className="flex flex-wrap gap-2">
                                            {allDays.map((day) => (
                                                <label
                                                    key={day}
                                                    className={cn(
                                                        "flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm",
                                                        editor.settings.days.includes(
                                                            day,
                                                        ) &&
                                                            "border-primary/40 bg-primary/10 text-primary",
                                                    )}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        name="days"
                                                        value={day}
                                                        checked={editor.settings.days.includes(
                                                            day,
                                                        )}
                                                        onChange={(e) =>
                                                            change(
                                                                "days",
                                                                e.target.checked
                                                                    ? [
                                                                          ...editor
                                                                              .settings
                                                                              .days,
                                                                          day,
                                                                      ].sort()
                                                                    : editor.settings.days.filter(
                                                                          (
                                                                              value,
                                                                          ) =>
                                                                              value !==
                                                                              day,
                                                                      ),
                                                            )
                                                        }
                                                    />
                                                    <span>{dayName(day)}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </fieldset>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div className="space-y-1.5">
                                            <label
                                                htmlFor={`${prefix}-minutes`}
                                                className="text-sm font-medium"
                                            >
                                                {t("duration")}
                                            </label>
                                            <input
                                                name="minutes"
                                                id={`${prefix}-minutes`}
                                                className={field}
                                                type="number"
                                                min={5}
                                                max={480}
                                                required
                                                value={
                                                    Number.isNaN(
                                                        editor.settings.minutes,
                                                    )
                                                        ? ""
                                                        : editor.settings
                                                              .minutes
                                                }
                                                onChange={(e) =>
                                                    change(
                                                        "minutes",
                                                        e.target.valueAsNumber,
                                                    )
                                                }
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label
                                                htmlFor={`${prefix}-reminder`}
                                                className="text-sm font-medium"
                                            >
                                                {t("reminder")}
                                            </label>
                                            <input
                                                name="reminderTime"
                                                id={`${prefix}-reminder`}
                                                className={field}
                                                type="time"
                                                value={
                                                    editor.settings
                                                        .reminderTime ?? ""
                                                }
                                                onChange={(e) =>
                                                    change(
                                                        "reminderTime",
                                                        e.target.value || null,
                                                    )
                                                }
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label
                                            htmlFor={`${prefix}-zone`}
                                            className="text-sm font-medium"
                                        >
                                            {t("timezone")}
                                        </label>
                                        <input
                                            name="timezone"
                                            id={`${prefix}-zone`}
                                            className={field}
                                            required
                                            maxLength={100}
                                            list={`${prefix}-zones`}
                                            value={editor.settings.timezone}
                                            onChange={(e) =>
                                                change(
                                                    "timezone",
                                                    e.target.value,
                                                )
                                            }
                                        />
                                        <datalist id={`${prefix}-zones`}>
                                            {Array.from(
                                                new Set([
                                                    timezone,
                                                    ...Intl.supportedValuesOf(
                                                        "timeZone",
                                                    ),
                                                    "UTC",
                                                ]),
                                            ).map((zone) => (
                                                <option
                                                    key={zone}
                                                    value={zone}
                                                />
                                            ))}
                                        </datalist>
                                        <p className="text-xs leading-5 text-muted-foreground">
                                            {t("reminderHint")}{" "}
                                            <Link
                                                href="/settings"
                                                className="text-primary underline"
                                            >
                                                {t("notificationSettings")}
                                            </Link>
                                        </p>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label
                                            htmlFor={`${prefix}-surah`}
                                            className="text-sm font-medium"
                                        >
                                            {t("surah")}
                                        </label>
                                        <select
                                            name="surahNumber"
                                            id={`${prefix}-surah`}
                                            className={field}
                                            value={
                                                editor.settings.surahNumber ??
                                                ""
                                            }
                                            onChange={(e) =>
                                                change(
                                                    "surahNumber",
                                                    e.target.value
                                                        ? Number(e.target.value)
                                                        : null,
                                                )
                                            }
                                        >
                                            <option value="">
                                                {t("noSurah")}
                                            </option>
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
                                    </div>
                                    <div className="space-y-1.5">
                                        <label
                                            htmlFor={`${prefix}-url`}
                                            className="text-sm font-medium"
                                        >
                                            {t("resource")}
                                        </label>
                                        <input
                                            name="resourceUrl"
                                            id={`${prefix}-url`}
                                            className={field}
                                            type="url"
                                            maxLength={2000}
                                            value={
                                                editor.settings.resourceUrl ??
                                                ""
                                            }
                                            placeholder="https://"
                                            onChange={(e) =>
                                                change(
                                                    "resourceUrl",
                                                    e.target.value || null,
                                                )
                                            }
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            {t("resourceHint")}
                                        </p>
                                    </div>
                                </fieldset>
                                {error && (
                                    <p
                                        role="alert"
                                        className="text-sm text-destructive"
                                    >
                                        {error}
                                    </p>
                                )}
                                <div className="flex flex-wrap gap-2 border-t pt-4">
                                    <Button type="submit" disabled={pending}>
                                        {t(pending ? "saving" : "save")}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        disabled={pending}
                                        onClick={close}
                                    >
                                        {t("cancel")}
                                    </Button>
                                </div>
                            </form>
                        )}
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
            <Dialog.Root
                open={Boolean(archive)}
                onOpenChange={(value) => {
                    if (!value && !pending) setArchive(null);
                }}
            >
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
                    <Dialog.Content
                        dir={locale === "ar" ? "rtl" : "ltr"}
                        className="fixed inset-x-4 top-1/3 z-50 mx-auto max-w-md rounded-2xl border bg-background p-6 shadow-xl"
                    >
                        <Dialog.Title className="break-words text-lg font-semibold">
                            {t("archiveTitle", { title: archive?.title ?? "" })}
                        </Dialog.Title>
                        <Dialog.Description className="mt-3 text-sm leading-6 text-muted-foreground">
                            {t("archiveHint")}
                        </Dialog.Description>
                        <div className="mt-5 flex gap-2">
                            <Button
                                disabled={pending}
                                onClick={() =>
                                    archive && setState(archive, "archive")
                                }
                            >
                                {t("archive")}
                            </Button>
                            <Dialog.Close asChild>
                                <Button disabled={pending} variant="outline">
                                    {t("cancel")}
                                </Button>
                            </Dialog.Close>
                        </div>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
        </div>
    );
}
