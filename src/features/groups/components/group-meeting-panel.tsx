"use client";

import {
    CalendarClock,
    ChevronDown,
    Clock3,
    LoaderCircle,
    Settings2,
    ShieldCheck,
    Video,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type {
    GroupMeetingDetails,
    MeetingOccurrenceState,
    MeetingScheduleSlot,
} from "../meeting-types";
import { getMeetingDisplayTimezone } from "../server/meeting-schedule";
import saveGroupMeeting from "../server/save-group-meeting";
import MeetingScheduleFields from "./meeting-schedule-fields";

function formatOccurrence(value: string, locale: string, timezone: string) {
    const instant = new Date(value);
    const displayTimezone = getMeetingDisplayTimezone(timezone, instant);

    return new Intl.DateTimeFormat(locale, {
        weekday: "long",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: displayTimezone,
    }).format(instant);
}

function formatTimeRemaining(target: string, now: number) {
    const milliseconds = Math.max(0, new Date(target).getTime() - now);
    const totalMinutes = Math.ceil(milliseconds / 60_000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return { hours, minutes };
}

export default function GroupMeetingPanel({
    groupId,
    meeting,
    state,
    isAdmin,
    isHost,
    locale,
    providerConfigured,
}: {
    groupId: string;
    meeting: GroupMeetingDetails | null;
    state: MeetingOccurrenceState | null;
    isAdmin: boolean;
    isHost: boolean;
    locale: string;
    providerConfigured: boolean;
}) {
    const t = useTranslations("Groups.meeting");
    const router = useRouter();
    const [now, setNow] = useState(Date.now());
    const [isSaving, setIsSaving] = useState(false);
    const [schedule, setSchedule] = useState<MeetingScheduleSlot[]>(
        meeting?.schedule ?? [{ weekday: 1, localTime: "20:00" }],
    );
    const [timezone, setTimezone] = useState(meeting?.timezone ?? "");

    useEffect(() => {
        const interval = window.setInterval(() => setNow(Date.now()), 30_000);
        return () => window.clearInterval(interval);
    }, []);

    useEffect(() => {
        const boundary =
            state?.status === "active"
                ? state.activeEndsAt
                : state?.nextStartsAt;
        if (!boundary) return;
        const delay = new Date(boundary).getTime() - Date.now() + 1_000;
        if (delay <= 0) {
            router.refresh();
            return;
        }
        const timeout = window.setTimeout(
            () => router.refresh(),
            Math.min(delay, 2_147_000_000),
        );
        return () => window.clearTimeout(timeout);
    }, [router, state]);

    const remaining = useMemo(() => {
        if (state?.status !== "active" || !state.activeEndsAt) return null;
        return formatTimeRemaining(state.activeEndsAt, now);
    }, [now, state]);

    async function save() {
        setIsSaving(true);
        const result = await saveGroupMeeting({ groupId, schedule, timezone });
        setIsSaving(false);
        if (!result.success) {
            toast.error(t("saveError"));
            return;
        }
        toast.success(t("saved"));
        router.refresh();
    }

    const active = state?.status === "active";
    const nextLabel =
        meeting && state?.nextStartsAt
            ? formatOccurrence(state.nextStartsAt, locale, meeting.timezone)
            : null;

    return (
        <section className="relative mt-10 overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary/[0.12] via-card to-card shadow-[0_24px_70px_-45px_hsl(var(--primary)/0.65)] ring-1 ring-primary/15">
            <div className="pointer-events-none absolute -end-20 -top-24 size-64 rounded-full bg-primary/10 blur-3xl" />
            <div className="relative grid gap-7 px-5 py-7 sm:px-8 sm:py-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <div className="flex min-w-0 items-start gap-4">
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                        {active ? (
                            <Video className="size-5.5" />
                        ) : (
                            <CalendarClock className="size-5.5" />
                        )}
                    </span>
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5">
                            <p className="text-xs font-bold tracking-[0.15em] text-primary uppercase">
                                {active ? t("liveEyebrow") : t("eyebrow")}
                            </p>
                            {meeting && (
                                <span className="rounded-full bg-background/65 px-2.5 py-1 text-xs text-muted-foreground">
                                    {meeting.timezone}
                                </span>
                            )}
                        </div>
                        <h2 className="mt-2.5 text-2xl font-semibold tracking-tight sm:text-3xl">
                            {!meeting
                                ? t("setupTitle")
                                : active
                                  ? t("liveTitle")
                                  : nextLabel
                                    ? nextLabel
                                    : t("pausedTitle")}
                        </h2>
                        <p className="mt-2.5 max-w-2xl text-sm leading-6 text-muted-foreground">
                            {!meeting
                                ? t(
                                      isAdmin
                                          ? "setupDescriptionAdmin"
                                          : "setupDescriptionMember",
                                  )
                                : active && remaining
                                  ? t("closesIn", remaining)
                                  : t("hostedBy", {
                                        name: meeting.hostName,
                                    })}
                        </p>
                        {meeting && (
                            <div className="mt-5 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                {meeting.schedule.map((slot) => (
                                    <span
                                        key={`${slot.weekday}:${slot.localTime}`}
                                        className="inline-flex items-center gap-1.5 rounded-full bg-background/70 px-3 py-1.5 shadow-sm ring-1 ring-border/40"
                                    >
                                        <Clock3 className="size-3.5 text-primary" />
                                        {t(`weekdays.${slot.weekday}`)} ·{" "}
                                        {slot.localTime}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                    {active && providerConfigured ? (
                        <Button
                            asChild
                            size="lg"
                            className="rounded-xl px-7 shadow-lg shadow-primary/20"
                        >
                            <Link href={`/groups/${groupId}/meeting`}>
                                <Video className="size-4.5" />
                                {t(isHost ? "start" : "join")}
                            </Link>
                        </Button>
                    ) : (
                        meeting && (
                            <Button
                                disabled
                                size="lg"
                                className="rounded-xl px-6"
                            >
                                <CalendarClock className="size-4.5" />
                                {providerConfigured
                                    ? t("notOpen")
                                    : t("providerUnavailable")}
                            </Button>
                        )
                    )}
                </div>
            </div>

            {isAdmin && (
                <details className="group relative bg-background/35">
                    <summary className="flex cursor-pointer list-none items-center gap-2 border-primary/10 border-t px-5 py-4 text-sm font-semibold text-muted-foreground outline-none transition-colors hover:bg-background/35 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring sm:px-8 [&::-webkit-details-marker]:hidden">
                        <Settings2 className="size-4 text-primary" />
                        {meeting ? t("editSchedule") : t("configure")}
                        <ChevronDown className="ms-auto size-4 transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="grid gap-8 px-5 pb-8 pt-5 sm:px-8 lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-end">
                        <MeetingScheduleFields
                            schedule={schedule}
                            setSchedule={setSchedule}
                            timezone={timezone}
                            setTimezone={setTimezone}
                            disabled={isSaving}
                        />
                        <div className="space-y-5 lg:border-primary/10 lg:border-s lg:ps-8">
                            <div className="flex items-start gap-2 text-sm text-muted-foreground">
                                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                                <p>
                                    {t("hostNote", {
                                        name: meeting?.hostName ?? t("you"),
                                    })}
                                </p>
                            </div>
                            <Button
                                type="button"
                                disabled={isSaving}
                                onClick={save}
                                className="w-full rounded-xl"
                            >
                                {isSaving && (
                                    <LoaderCircle className="size-4 animate-spin" />
                                )}
                                {t(isSaving ? "saving" : "save")}
                            </Button>
                        </div>
                    </div>
                </details>
            )}
        </section>
    );
}
