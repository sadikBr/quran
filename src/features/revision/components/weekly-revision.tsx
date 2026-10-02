"use client";
import { CalendarDays, Check, Pause, RefreshCcw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { RevisionSettings, ScheduledRange } from "../schedule";
import {
    pauseWeeklyRevision,
    previewWeeklyRevision,
    saveWeeklyRevision,
} from "../server/actions";
import type { RevisionPreview, RevisionView } from "../server/service";
import RevisionPlanSettings from "./revision-plan-settings";

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
                        <>
                            <RevisionPlanSettings
                                settings={settings}
                                pending={pending}
                                hasPlan={Boolean(view.plan)}
                                onChange={change}
                                onPreview={() =>
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
                                onCancel={() => {
                                    setEditing(false);
                                    setPreview(null);
                                }}
                            />
                            {preview && (
                                <section
                                    aria-labelledby="revision-preview-title"
                                    aria-live="polite"
                                    className="rounded-3xl border border-primary/25 bg-primary/[0.04] p-5 sm:p-6"
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <p className="text-xs font-medium uppercase tracking-[0.16em] text-primary">
                                                {t("preview")}
                                            </p>
                                            <h2
                                                id="revision-preview-title"
                                                className="mt-1 text-lg font-semibold"
                                            >
                                                {t(
                                                    preview.nextWeek
                                                        ? "nextPreview"
                                                        : "currentPreview",
                                                )}
                                            </h2>
                                        </div>
                                        <span className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
                                            {t("pool", {
                                                count: preview.completedHizbs,
                                            })}
                                        </span>
                                    </div>
                                    <div className="mt-5">
                                        {!preview.ready ? (
                                            <p className="rounded-2xl border border-border/40 bg-background/20 p-4 text-sm">
                                                {t("noMemorization")}
                                            </p>
                                        ) : !preview.sessions.length ? (
                                            <p className="rounded-2xl border border-border/40 bg-background/20 p-4 text-sm">
                                                {t("noDaysLeft")}
                                            </p>
                                        ) : (
                                            <ol className="grid gap-2 sm:grid-cols-2">
                                                {preview.sessions.map(
                                                    (item) => (
                                                        <li
                                                            key={item.ordinal}
                                                            className="rounded-2xl border border-border/40 bg-background/20 p-4"
                                                        >
                                                            <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                                                                <span className="font-medium text-foreground">
                                                                    {date(
                                                                        item.scheduledDate,
                                                                    )}
                                                                </span>
                                                                <span>
                                                                    {t(
                                                                        `amount${item.quarters.length}`,
                                                                    )}
                                                                </span>
                                                            </div>
                                                            <p className="mt-2 text-sm leading-7">
                                                                {range(item)}
                                                            </p>
                                                        </li>
                                                    ),
                                                )}
                                            </ol>
                                        )}
                                    </div>
                                    <div className="mt-5 flex flex-col gap-4 border-t border-primary/15 pt-4 sm:flex-row sm:items-center sm:justify-between">
                                        <p className="text-xs leading-6 text-muted-foreground">
                                            {t("capacityHint")}
                                        </p>
                                        <Button
                                            disabled={pending || !preview.ready}
                                            onClick={() =>
                                                act(async () => {
                                                    const r =
                                                        await saveWeeklyRevision(
                                                            {
                                                                settings,
                                                                key: preview.key,
                                                                confirmed: true,
                                                            },
                                                        );
                                                    if (!r.success) {
                                                        toast.error(
                                                            t(
                                                                r.reason ===
                                                                    "stale"
                                                                    ? "stale"
                                                                    : "failed",
                                                            ),
                                                        );
                                                        setPreview(null);
                                                    } else {
                                                        setEditing(false);
                                                        setPreview(null);
                                                        toast.success(
                                                            t("saved"),
                                                        );
                                                        router.refresh();
                                                    }
                                                })
                                            }
                                            className="shrink-0"
                                        >
                                            {t(
                                                view.plan?.enabled
                                                    ? "save"
                                                    : "enable",
                                            )}
                                        </Button>
                                    </div>
                                </section>
                            )}
                        </>
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
