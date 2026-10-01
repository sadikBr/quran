"use client";

import {
    CalendarClock,
    ChevronDown,
    LoaderCircle,
    ShieldCheck,
} from "lucide-react";
import { DateTime } from "luxon";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getMeetingDisplayTimezone } from "../server/meeting-schedule";
import rescheduleMeeting from "../server/reschedule-meeting";

export default function RescheduleMeeting({
    groupId,
    startsAt,
    timezone,
}: {
    groupId: string;
    startsAt: string;
    timezone: string;
}) {
    const t = useTranslations("Groups.meeting");
    const locale = useLocale();
    const router = useRouter();
    const original = DateTime.fromISO(startsAt, {
        zone: getMeetingDisplayTimezone(timezone, new Date(startsAt)),
    }).toFormat("yyyy-MM-dd'T'HH:mm");
    const [day, setDay] = useState(original.slice(0, 10));
    const [time, setTime] = useState(original.slice(11));
    const [busy, setBusy] = useState(false);
    const value = `${day}T${time}`;
    const candidate = new Date(`${value}Z`);
    const selectedDate = Number.isNaN(candidate.getTime())
        ? null
        : DateTime.fromISO(value, {
              zone: getMeetingDisplayTimezone(timezone, candidate),
          });
    const validSelection = Boolean(
        day &&
            time &&
            selectedDate?.isValid &&
            selectedDate.toFormat("yyyy-MM-dd'T'HH:mm") === value,
    );
    const changed = validSelection && value !== original;
    const format = (instant: Date) =>
        new Intl.DateTimeFormat(locale, {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone: getMeetingDisplayTimezone(timezone, instant),
        }).format(instant);
    const localDay = (instant: Date) =>
        DateTime.fromJSDate(instant, {
            zone: getMeetingDisplayTimezone(timezone, instant),
        }).toFormat("yyyy-MM-dd");

    return (
        <details className="group/once overflow-hidden rounded-xl border border-border/60 bg-card">
            <summary className="flex cursor-pointer list-none items-start gap-3 p-4 outline-none transition-colors hover:bg-muted/25 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                <CalendarClock
                    aria-hidden="true"
                    className="mt-1 size-5 shrink-0 text-primary"
                />
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                        <h3 className="text-sm font-semibold leading-6">
                            {t("rescheduleOne")}
                        </h3>
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs leading-5 text-primary">
                            {t("oneTimeScope")}
                        </span>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {t("oneTimeSummary")}
                    </p>
                </div>
                <ChevronDown
                    aria-hidden="true"
                    className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-open/once:rotate-180"
                />
            </summary>
            <form
                className="space-y-5 border-t border-border/50 p-4 sm:p-5"
                onSubmit={async (event) => {
                    event.preventDefault();
                    if (busy || !changed || !selectedDate) return;
                    if (!validSelection) {
                        toast.error(t("rescheduleError"));
                        return;
                    }
                    setBusy(true);
                    try {
                        const result = await rescheduleMeeting({
                            groupId,
                            from: startsAt,
                            to: selectedDate.toUTC().toISO(),
                        });
                        if (!result.success) {
                            toast.error(t("rescheduleError"));
                            return;
                        }
                        toast.success(t("rescheduled"));
                        router.refresh();
                    } catch {
                        toast.error(t("rescheduleError"));
                    } finally {
                        setBusy(false);
                    }
                }}
            >
                <dl className="rounded-xl bg-muted/40 p-3">
                    <dt className="text-xs font-medium text-muted-foreground">
                        {t("currentMeeting")}
                    </dt>
                    <dd className="mt-1 text-sm font-medium leading-6">
                        <time dateTime={startsAt}>
                            <bdi>{format(new Date(startsAt))}</bdi>
                        </time>
                    </dd>
                </dl>
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor={`reschedule-date-${groupId}`}>
                            {t("newDate")}
                        </Label>
                        <Input
                            id={`reschedule-date-${groupId}`}
                            type="date"
                            dir="ltr"
                            required
                            min={localDay(new Date())}
                            max={localDay(new Date(Date.now() + 90 * 86400000))}
                            value={day}
                            onChange={(event) => setDay(event.target.value)}
                            disabled={busy}
                            className="bg-background text-start"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor={`reschedule-time-${groupId}`}>
                            {t("newClockTime")}
                        </Label>
                        <Input
                            id={`reschedule-time-${groupId}`}
                            type="time"
                            dir="ltr"
                            required
                            value={time}
                            onChange={(event) => setTime(event.target.value)}
                            disabled={busy}
                            className="bg-background text-start"
                        />
                    </div>
                </div>
                <p className="text-xs leading-6 text-muted-foreground">
                    {t("oneTimeTimezone", { timezone })}
                </p>
                {changed && selectedDate && (
                    <dl
                        aria-live="polite"
                        className="rounded-xl border border-primary/20 bg-primary/5 p-3"
                    >
                        <dt className="text-xs font-medium text-primary">
                            {t("newMeetingTime")}
                        </dt>
                        <dd className="mt-1 text-sm font-semibold leading-6">
                            <bdi>{format(selectedDate.toJSDate())}</bdi>
                        </dd>
                    </dl>
                )}
                <p className="text-sm leading-6 text-muted-foreground">
                    {t("oneTimeImpact")}
                </p>
                <div className="flex flex-col gap-3 border-t border-border/50 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="flex items-start gap-2 text-xs leading-6 text-muted-foreground">
                        <ShieldCheck
                            aria-hidden="true"
                            className="mt-1 size-4 shrink-0 text-primary"
                        />
                        {t("progressPreserved")}
                    </p>
                    <Button
                        type="submit"
                        disabled={busy || !changed}
                        className="min-h-11 shrink-0 rounded-xl"
                    >
                        {busy && (
                            <LoaderCircle
                                aria-hidden="true"
                                className="size-4 animate-spin"
                            />
                        )}
                        {t(busy ? "saving" : "saveOneTime")}
                    </Button>
                </div>
            </form>
        </details>
    );
}
