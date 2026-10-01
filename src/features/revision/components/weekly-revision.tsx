"use client";
import { CalendarDays, Check, Pause, RefreshCcw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { RevisionSettings, ScheduledRange } from "../schedule";
import {
    pauseWeeklyRevision,
    previewWeeklyRevision,
    saveWeeklyRevision,
} from "../server/actions";
import type { RevisionPreview, RevisionView } from "../server/service";

export default function WeeklyRevision({
    view,
    defaultTimezone,
    defaultRiwayah,
    surahs,
}: {
    view: RevisionView;
    defaultTimezone: string;
    defaultRiwayah: "hafs" | "warsh";
    surahs: { number: number; name: string; englishName: string }[];
}) {
    const t = useTranslations("Memorization.weekly"),
        locale = useLocale(),
        router = useRouter();
    const [editing, setEditing] = useState(!view.plan);
    const [settings, setSettings] = useState<RevisionSettings>(() =>
        view.plan
            ? {
                  days: view.plan.days,
                  quartersPerDay: view.plan.quartersPerDay as 1 | 2 | 4,
                  timezone: view.plan.timezone,
                  riwayah: view.plan.riwayah,
                  reminderTime: view.plan.reminderTime,
              }
            : {
                  days: [1, 2, 3, 4, 5],
                  quartersPerDay: 2,
                  timezone: defaultTimezone,
                  riwayah: defaultRiwayah,
                  reminderTime: null,
              },
    );
    const [preview, setPreview] = useState<RevisionPreview | null>(null),
        [pending, setPending] = useState(false);
    const busy = useRef(false);
    useEffect(() => {
        const refresh = () => {
            if (document.visibilityState === "visible") router.refresh();
        };
        const timer = setInterval(refresh, 60000);
        document.addEventListener("visibilitychange", refresh);
        return () => {
            clearInterval(timer);
            document.removeEventListener("visibilitychange", refresh);
        };
    }, [router]);
    function change(value: Partial<RevisionSettings>) {
        setSettings((s) => ({ ...s, ...value }));
        setPreview(null);
    }
    async function act(task: () => Promise<void>) {
        if (busy.current) return;
        busy.current = true;
        setPending(true);
        try {
            await task();
        } catch {
            toast.error(t("failed"));
        } finally {
            busy.current = false;
            setPending(false);
        }
    }
    const date = (value: string) =>
        new Date(`${value}T12:00:00Z`).toLocaleDateString(locale, {
            weekday: "long",
            month: "short",
            day: "numeric",
            timeZone: "UTC",
        });
    const range = (
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
        });
    const eligible = view.sessions.filter((s) => s.available || s.done),
        done = eligible.filter((s) => s.done).length;
    return (
        <div className="mt-6 space-y-6">
            {!view.setup && (
                <div className="app-card space-y-3 p-5">
                    <p>{t("setupRequired")}</p>
                    <Button asChild>
                        <Link href="/memorization">{t("map")}</Link>
                    </Button>
                </div>
            )}
            {view.setup && (
                <>
                    {view.plan && (
                        <section className="app-card space-y-4 p-5 sm:p-6">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <h2 className="flex items-center gap-2 text-lg font-semibold">
                                    <CalendarDays
                                        className="size-5 text-primary"
                                        aria-hidden="true"
                                    />
                                    {t(
                                        view.plan?.enabled
                                            ? "thisWeek"
                                            : view.plan
                                              ? "paused"
                                              : "optIn",
                                    )}
                                </h2>
                                {view.plan && (
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            disabled={pending}
                                            onClick={() => {
                                                setPreview(null);
                                                setEditing((v) => !v);
                                            }}
                                        >
                                            {t(
                                                view.plan.enabled
                                                    ? "settings"
                                                    : "resume",
                                            )}
                                        </Button>
                                        {view.plan.enabled && (
                                            <Button
                                                variant="ghost"
                                                disabled={pending}
                                                onClick={() =>
                                                    act(async () => {
                                                        const r =
                                                            await pauseWeeklyRevision(
                                                                {
                                                                    revision:
                                                                        view
                                                                            .plan
                                                                            ?.revision,
                                                                },
                                                            );
                                                        if (!r.success)
                                                            toast.error(
                                                                t("failed"),
                                                            );
                                                        else {
                                                            toast.success(
                                                                t("paused"),
                                                            );
                                                            router.refresh();
                                                        }
                                                    })
                                                }
                                            >
                                                <Pause
                                                    aria-hidden="true"
                                                    className="size-4"
                                                />
                                                {t("pause")}
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>
                            <p className="text-sm leading-7 text-muted-foreground">
                                {t(
                                    view.plan?.enabled
                                        ? "stableWeek"
                                        : view.plan
                                          ? "pauseHint"
                                          : "intro",
                                )}
                            </p>
                            {view.week && (
                                <>
                                    <p className="text-sm">
                                        {t("weekOf", {
                                            date: date(view.week.weekStart),
                                        })}{" "}
                                        · {t(view.week.riwayah)} ·{" "}
                                        <bdi>{view.week.timezone}</bdi>
                                    </p>
                                    <div className="flex items-center gap-3">
                                        <div
                                            role="progressbar"
                                            aria-label={t("progress")}
                                            aria-valuenow={done}
                                            aria-valuemin={0}
                                            aria-valuemax={Math.max(
                                                eligible.length,
                                                1,
                                            )}
                                            className="h-2 flex-1 overflow-hidden rounded-full bg-primary/10"
                                        >
                                            <div
                                                className="h-full rounded-full bg-primary transition-[width]"
                                                style={{
                                                    width: `${(100 * done) / Math.max(eligible.length, 1)}%`,
                                                }}
                                            />
                                        </div>
                                        <span className="text-sm font-semibold">
                                            {t("completed", {
                                                done,
                                                total: eligible.length,
                                            })}
                                        </span>
                                    </div>
                                </>
                            )}
                            {view.completedHizbs === 0 && (
                                <p className="text-sm text-muted-foreground">
                                    {t("noMemorization")}
                                </p>
                            )}
                        </section>
                    )}
                    {editing && (
                        <section className="app-card space-y-5 p-5 sm:p-6">
                            <h2 className="font-semibold">{t("settings")}</h2>
                            <fieldset disabled={pending} className="space-y-3">
                                <legend className="mb-3 text-sm font-medium">
                                    {t("days")}
                                </legend>
                                <div className="flex flex-wrap gap-2">
                                    {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                                        <label
                                            key={day}
                                            className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm ${settings.days.includes(day) ? "border-primary/40 bg-primary/10" : "border-border"}`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={settings.days.includes(
                                                    day,
                                                )}
                                                onChange={() =>
                                                    change({
                                                        days: settings.days.includes(
                                                            day,
                                                        )
                                                            ? settings.days.filter(
                                                                  (d) =>
                                                                      d !== day,
                                                              )
                                                            : [
                                                                  ...settings.days,
                                                                  day,
                                                              ].sort(),
                                                    })
                                                }
                                                className="accent-primary"
                                            />
                                            {t(`day${day}`)}
                                        </label>
                                    ))}
                                </div>
                            </fieldset>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <label className="space-y-2 text-sm">
                                    <span>{t("amount")}</span>
                                    <select
                                        disabled={pending}
                                        value={settings.quartersPerDay}
                                        onChange={(e) =>
                                            change({
                                                quartersPerDay: Number(
                                                    e.target.value,
                                                ) as 1 | 2 | 4,
                                            })
                                        }
                                        className="flex h-11 w-full rounded-xl border border-input bg-background px-3"
                                    >
                                        {[1, 2, 4].map((q) => (
                                            <option key={q} value={q}>
                                                {t(`amount${q}`)}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label
                                    htmlFor="revision-timezone"
                                    className="space-y-2 text-sm"
                                >
                                    <span>{t("timezone")}</span>
                                    <Input
                                        id="revision-timezone"
                                        disabled={pending}
                                        value={settings.timezone}
                                        onChange={(e) =>
                                            change({ timezone: e.target.value })
                                        }
                                        placeholder="Africa/Casablanca"
                                        dir="ltr"
                                    />
                                </label>
                            </div>
                            <label className="block space-y-2 text-sm">
                                <span>{t("reading")}</span>
                                <select
                                    disabled={pending}
                                    value={settings.riwayah}
                                    onChange={(e) =>
                                        change({
                                            riwayah: e.target.value as
                                                | "hafs"
                                                | "warsh",
                                        })
                                    }
                                    className="flex h-11 w-full rounded-xl border border-input bg-background px-3"
                                >
                                    <option value="hafs">{t("hafs")}</option>
                                    <option value="warsh">{t("warsh")}</option>
                                </select>
                            </label>
                            <div className="space-y-3">
                                <label className="flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        disabled={pending}
                                        checked={settings.reminderTime !== null}
                                        onChange={(e) =>
                                            change({
                                                reminderTime: e.target.checked
                                                    ? "19:00"
                                                    : null,
                                            })
                                        }
                                        className="accent-primary"
                                    />
                                    {t("reminder")}
                                </label>
                                {settings.reminderTime !== null && (
                                    <>
                                        <label
                                            htmlFor="revision-reminder-time"
                                            className="block space-y-2 text-sm"
                                        >
                                            <span>{t("reminderTime")}</span>
                                            <Input
                                                id="revision-reminder-time"
                                                type="time"
                                                disabled={pending}
                                                value={settings.reminderTime}
                                                onChange={(e) =>
                                                    change({
                                                        reminderTime:
                                                            e.target.value,
                                                    })
                                                }
                                            />
                                        </label>
                                        <p className="text-xs leading-6 text-muted-foreground">
                                            {t("reminderHint")}{" "}
                                            <Link
                                                href="/settings"
                                                className="text-primary underline"
                                            >
                                                {t("deviceSettings")}
                                            </Link>
                                        </p>
                                    </>
                                )}
                            </div>
                            <p className="text-sm leading-7 text-muted-foreground">
                                {t("previewHint")}
                            </p>
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    disabled={
                                        pending ||
                                        !settings.days.length ||
                                        !settings.timezone
                                    }
                                    onClick={() =>
                                        act(async () => {
                                            const r =
                                                await previewWeeklyRevision(
                                                    settings,
                                                );
                                            if (!r.success)
                                                toast.error(t("invalid"));
                                            else setPreview(r.preview);
                                        })
                                    }
                                >
                                    {t("preview")}
                                </Button>
                                {view.plan && (
                                    <Button
                                        variant="outline"
                                        disabled={pending}
                                        onClick={() => {
                                            setEditing(false);
                                            setPreview(null);
                                        }}
                                    >
                                        {t("cancel")}
                                    </Button>
                                )}
                            </div>
                            {preview && (
                                <div className="space-y-4 rounded-xl border border-primary/25 bg-primary/5 p-4">
                                    <h3 className="font-semibold">
                                        {t(
                                            preview.nextWeek
                                                ? "nextPreview"
                                                : "currentPreview",
                                        )}
                                    </h3>
                                    <p className="text-sm">
                                        {t("pool", {
                                            count: preview.completedHizbs,
                                        })}
                                    </p>
                                    {!preview.ready ? (
                                        <p className="text-sm">
                                            {t("noMemorization")}
                                        </p>
                                    ) : !preview.sessions.length ? (
                                        <p className="text-sm">
                                            {t("noDaysLeft")}
                                        </p>
                                    ) : (
                                        <ol className="space-y-3">
                                            {preview.sessions.map((item) => (
                                                <li
                                                    key={item.ordinal}
                                                    className="border-b border-border/50 pb-3 text-sm leading-7"
                                                >
                                                    <strong>
                                                        {date(
                                                            item.scheduledDate,
                                                        )}
                                                    </strong>
                                                    <p>{range(item)}</p>
                                                    <span className="text-xs text-muted-foreground">
                                                        {t(
                                                            `amount${item.quarters.length}`,
                                                        )}
                                                    </span>
                                                </li>
                                            ))}
                                        </ol>
                                    )}
                                    <p className="text-xs leading-6 text-muted-foreground">
                                        {t("capacityHint")}
                                    </p>
                                    <Button
                                        disabled={pending || !preview.ready}
                                        onClick={() =>
                                            act(async () => {
                                                const r =
                                                    await saveWeeklyRevision({
                                                        settings,
                                                        key: preview.key,
                                                        confirmed: true,
                                                    });
                                                if (!r.success) {
                                                    toast.error(
                                                        t(
                                                            r.reason === "stale"
                                                                ? "stale"
                                                                : "failed",
                                                        ),
                                                    );
                                                    setPreview(null);
                                                } else {
                                                    setEditing(false);
                                                    setPreview(null);
                                                    toast.success(t("saved"));
                                                    router.refresh();
                                                }
                                            })
                                        }
                                    >
                                        {t(
                                            view.plan?.enabled
                                                ? "save"
                                                : "enable",
                                        )}
                                    </Button>
                                </div>
                            )}
                        </section>
                    )}
                    {view.week && (
                        <section
                            className="space-y-4"
                            aria-label={t("sessions")}
                        >
                            {!view.sessions.length && (
                                <p className="app-card p-5 text-sm text-muted-foreground">
                                    {t("noDaysLeft")}
                                </p>
                            )}
                            {[
                                ...new Set(
                                    view.sessions.map((s) => s.scheduledDate),
                                ),
                            ].map((day) => (
                                <div key={day} className="space-y-3">
                                    <h2 className="pt-2 text-sm font-semibold text-muted-foreground">
                                        {date(day)}
                                        {day === view.today
                                            ? ` · ${t("today")}`
                                            : ""}
                                    </h2>
                                    {view.sessions
                                        .filter((s) => s.scheduledDate === day)
                                        .map((item) => (
                                            <article
                                                key={item.id}
                                                className="app-card space-y-3 p-5"
                                            >
                                                <div className="flex items-start gap-3">
                                                    {item.done ? (
                                                        <Check
                                                            className="mt-1 size-5 shrink-0 text-primary"
                                                            aria-hidden="true"
                                                        />
                                                    ) : (
                                                        <RefreshCcw
                                                            className="mt-1 size-5 shrink-0 text-muted-foreground"
                                                            aria-hidden="true"
                                                        />
                                                    )}
                                                    <div className="min-w-0 flex-1">
                                                        <h3 className="font-semibold leading-7">
                                                            {range(item)}
                                                        </h3>
                                                        <p className="mt-1 text-xs text-muted-foreground">
                                                            {t(
                                                                `amount${item.quarters.length}`,
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                                <p className="text-sm">
                                                    {t(
                                                        item.done
                                                            ? item.outcome ===
                                                              "difficult"
                                                                ? "difficultSaved"
                                                                : item.completedAt
                                                                  ? "comfortableSaved"
                                                                  : "peerDone"
                                                            : !item.available
                                                              ? "removed"
                                                              : day < view.today
                                                                ? "overdue"
                                                                : "planned",
                                                    )}
                                                </p>
                                                {item.peer > 0 && (
                                                    <p className="text-xs text-muted-foreground">
                                                        {t("peerCredit", {
                                                            count: item.peer,
                                                            total: item.total,
                                                        })}
                                                    </p>
                                                )}
                                                {!item.done &&
                                                    item.available &&
                                                    view.plan?.enabled && (
                                                        <Button
                                                            asChild
                                                            className="min-h-11"
                                                        >
                                                            <Link
                                                                href={`/memorization/revision/${item.id}`}
                                                            >
                                                                {t(
                                                                    item.progressSurahNumber
                                                                        ? "continue"
                                                                        : "start",
                                                                )}
                                                            </Link>
                                                        </Button>
                                                    )}
                                            </article>
                                        ))}
                                </div>
                            ))}
                        </section>
                    )}
                </>
            )}
        </div>
    );
}
