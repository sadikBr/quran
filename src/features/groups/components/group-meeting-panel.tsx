"use client";

import {
    CalendarClock,
    Clock3,
    Globe2,
    Settings2,
    UserRound,
    Video,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type {
    GroupMeetingDetails,
    MeetingOccurrenceState,
} from "../meeting-types";
import { getMeetingDisplayTimezone } from "../server/meeting-schedule";
import CancelMeetingButton from "./cancel-meeting-button";
import MeetingCountdown from "./meeting-countdown";
import MeetingHostControl from "./meeting-host-control";

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
    children,
    supervisors = [],
    showPlanAction = true,
}: {
    groupId: string;
    meeting: GroupMeetingDetails | null;
    state: MeetingOccurrenceState | null;
    isAdmin: boolean;
    isHost: boolean;
    locale: string;
    providerConfigured: boolean;
    children?: ReactNode;
    supervisors?: { id: string; name: string }[];
    showPlanAction?: boolean;
}) {
    const t = useTranslations("Groups.meeting");
    const flow = useTranslations("Groups.flow");
    const router = useRouter();
    const [now, setNow] = useState(Date.now());
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

    const active = state?.status === "active";
    const canJoin = active && providerConfigured;
    const nextLabel =
        meeting && state?.nextStartsAt
            ? formatOccurrence(state.nextStartsAt, locale, meeting.timezone)
            : null;

    const rescheduled = Boolean(
        !active &&
            state?.nextStartsAt &&
            meeting?.rescheduledOccurrences?.some(
                (change) =>
                    new Date(change.to).getTime() ===
                    new Date(state.nextStartsAt ?? "").getTime(),
            ),
    );

    return (
        <section
            id="meeting-overview"
            className="relative mt-8 scroll-mt-24 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm"
        >
            <div className="relative space-y-4 p-4 sm:p-5">
                <div className="flex min-w-0 items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        {active ? (
                            <Video className="size-5" />
                        ) : (
                            <CalendarClock className="size-5" />
                        )}
                    </span>
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2.5">
                            <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-medium text-muted-foreground">
                                    {active ? t("liveEyebrow") : t("eyebrow")}
                                </p>
                                {rescheduled && (
                                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                                        {t("rescheduledBadge")}
                                    </span>
                                )}
                            </div>
                            {meeting && (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-2.5 py-1 text-xs text-muted-foreground">
                                    <Globe2
                                        aria-hidden="true"
                                        className="size-3.5"
                                    />
                                    <bdi>{meeting.timezone}</bdi>
                                </span>
                            )}
                        </div>
                        <h2 className="mt-2 break-words text-xl font-semibold leading-snug tracking-tight sm:text-2xl">
                            {!meeting
                                ? t(isAdmin ? "setupTitle" : "waitingTitle")
                                : active
                                  ? t("liveTitle")
                                  : nextLabel
                                    ? nextLabel
                                    : t("pausedTitle")}
                        </h2>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                            {!meeting
                                ? t(
                                      isAdmin
                                          ? "setupDescriptionAdmin"
                                          : "setupDescriptionMember",
                                  )
                                : active && remaining
                                  ? t("closesIn", remaining)
                                  : t(
                                        nextLabel
                                            ? "upcomingDescription"
                                            : "pausedDescription",
                                    )}
                        </p>
                        {meeting && meeting.schedule.length > 0 && (
                            <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                                <p>{t("regularTimes")}</p>
                                <div className="flex flex-wrap gap-2">
                                    {meeting.schedule.map((slot) => (
                                        <span
                                            key={`${slot.weekday}:${slot.localTime}`}
                                            className="inline-flex items-center gap-1.5 rounded-lg bg-muted/50 px-2.5 py-1.5"
                                        >
                                            <Clock3 className="size-3.5 text-primary" />
                                            {t(`weekdays.${slot.weekday}`)} ·{" "}
                                            <bdi>
                                                {new Intl.DateTimeFormat(
                                                    locale,
                                                    {
                                                        hour: "numeric",
                                                        minute: "2-digit",
                                                        timeZone: "UTC",
                                                    },
                                                ).format(
                                                    new Date(
                                                        `2000-01-01T${slot.localTime}:00Z`,
                                                    ),
                                                )}
                                            </bdi>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {meeting &&
                    state?.status === "upcoming" &&
                    state.nextStartsAt && (
                        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-primary/5 px-3 py-2.5">
                            <MeetingCountdown startsAt={state.nextStartsAt} />
                        </div>
                    )}
                {meeting && active && !canJoin && (
                    <p className="text-sm text-muted-foreground">
                        {t("providerUnavailable")}
                    </p>
                )}

                {(canJoin || (active && isAdmin)) && (
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-primary/10 pt-5">
                        {canJoin && (
                            <Button
                                asChild
                                size="lg"
                                className="min-h-11 w-full rounded-xl px-6 lg:w-auto"
                            >
                                <Link href={`/groups/${groupId}/meeting`}>
                                    <Video className="size-4.5" />
                                    {t(isHost ? "start" : "join")}
                                </Link>
                            </Button>
                        )}
                        {active && isAdmin && state?.activeStartsAt && (
                            <CancelMeetingButton
                                groupId={groupId}
                                occurrence={state.activeStartsAt}
                            />
                        )}
                    </div>
                )}
            </div>

            {children}

            {meeting && (
                <div className="flex flex-col gap-4 border-t border-border/50 bg-muted/20 p-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:p-5">
                    <div className="flex min-w-0 items-center gap-3 sm:flex-1">
                        <span
                            aria-hidden="true"
                            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-inset ring-primary/15"
                        >
                            <UserRound className="size-5" />
                        </span>
                        <dl className="min-w-0 text-sm">
                            <dt className="text-xs leading-5 text-muted-foreground">
                                {flow("hostLabel")}
                            </dt>
                            <dd className="mt-0.5 break-words font-semibold leading-6 text-foreground">
                                <bdi>{meeting.hostName}</bdi>
                            </dd>
                        </dl>
                    </div>
                    {isAdmin && (
                        <div className="flex flex-wrap items-center gap-2">
                            <Button
                                asChild
                                variant="ghost"
                                className="min-h-11 text-primary"
                            >
                                <a href="#meeting-settings">
                                    <Settings2
                                        aria-hidden="true"
                                        className="size-4"
                                    />
                                    {t("manageTimes")}
                                </a>
                            </Button>
                            {showPlanAction && (
                                <Button
                                    asChild
                                    variant="outline"
                                    className="min-h-11 rounded-xl"
                                >
                                    <Link href={`/groups/${groupId}/plan`}>
                                        {flow("plan")}
                                    </Link>
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            )}
            {isAdmin && meeting && supervisors.length > 1 && (
                <div className="border-t border-border/50 p-4 sm:p-5">
                    <MeetingHostControl
                        key={meeting.hostUserId}
                        groupId={groupId}
                        hostUserId={meeting.hostUserId}
                        supervisors={supervisors}
                    />
                </div>
            )}
        </section>
    );
}
