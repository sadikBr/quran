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
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import { cn } from "@/lib/utils";
import type {
    GroupMeetingDetails,
    MeetingOccurrenceState,
    MeetingScheduleSlot,
} from "../meeting-types";
import { getMeetingDisplayTimezone } from "../server/meeting-schedule";
import saveGroupMeeting from "../server/save-group-meeting";
import CancelMeetingButton from "./cancel-meeting-button";
import MeetingHostControl from "./meeting-host-control";
import MeetingScheduleFields from "./meeting-schedule-fields";
import RescheduleMeeting from "./reschedule-meeting";

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
}) {
    const t = useTranslations("Groups.meeting");
    const flow = useTranslations("Groups.flow");
    const router = useRouter();
    const [now, setNow] = useState(Date.now());
    const [isSaving, setIsSaving] = useState(false);
    const [impact, setImpact] = useState<{
        confirmation: string;
        moves: Array<{ from: string; to: string; count: number }>;
    } | null>(null);
    const [scheduleOpen, setScheduleOpen] = useState(!meeting);
    useEffect(() => {
        function openSchedule() {
            if (window.location.hash === "#meeting-schedule")
                setScheduleOpen(true);
        }
        openSchedule();
        window.addEventListener("hashchange", openSchedule);
        return () => window.removeEventListener("hashchange", openSchedule);
    }, []);
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

    async function save(confirmation?: string) {
        if (isSaving) return;
        setIsSaving(true);
        try {
            const result = await saveGroupMeeting({
                groupId,
                schedule,
                timezone,
                confirmation,
            });
            if (!result.success) {
                if (result.reason === "confirmation") {
                    setImpact({
                        confirmation: result.confirmation,
                        moves: result.moves,
                    });
                    return;
                }
                toast.error(
                    t(
                        result.reason === "active"
                            ? "scheduleLocked"
                            : "saveError",
                    ),
                );
                return;
            }
            setImpact(null);
            toast.success(t("saved"));
            router.refresh();
        } catch {
            toast.error(t("saveError"));
        } finally {
            setIsSaving(false);
        }
    }

    const active = state?.status === "active";
    const canJoin = active && providerConfigured;
    const nextLabel =
        meeting && state?.nextStartsAt
            ? formatOccurrence(state.nextStartsAt, locale, meeting.timezone)
            : null;

    return (
        <section
            id="meeting-overview"
            className="relative mt-8 scroll-mt-24 overflow-hidden rounded-2xl border border-primary/20 bg-card shadow-sm"
        >
            <div
                className={cn(
                    "relative grid gap-5 border-t-4 border-primary/70 bg-primary/[0.035] px-4 py-5 sm:px-6 sm:py-6",
                    (canJoin || (active && isAdmin)) &&
                        "lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center",
                )}
            >
                <div className="flex min-w-0 items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
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
                        <h2 className="mt-2 break-words text-xl font-semibold leading-relaxed tracking-tight sm:text-2xl">
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
                                  : isHost
                                    ? t("hostedByYou")
                                    : t("hostedBy", {
                                          name: meeting.hostName,
                                      })}
                        </p>
                        {meeting && meeting.schedule.length > 1 && (
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
                        {meeting && !canJoin && (
                            <span className="mt-5 inline-flex w-fit items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-xs font-semibold text-primary ring-1 ring-primary/15">
                                <CalendarClock className="size-4" />
                                {active
                                    ? t("providerUnavailable")
                                    : t("notOpen")}
                            </span>
                        )}
                    </div>
                </div>

                {(canJoin || (active && isAdmin)) && (
                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
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
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/50 px-4 py-3 text-sm sm:px-6">
                    <p className="text-muted-foreground">
                        {flow("host", { name: meeting.hostName })}
                    </p>
                    {isAdmin && (
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

            {isAdmin &&
                meeting &&
                state?.status === "upcoming" &&
                state.nextStartsAt && (
                    <RescheduleMeeting
                        key={state.nextStartsAt}
                        groupId={groupId}
                        startsAt={state.nextStartsAt}
                        timezone={meeting.timezone}
                    />
                )}
            <ConfirmationDialog
                open={impact !== null}
                onOpenChange={(open) => {
                    if (!open) setImpact(null);
                }}
                title={t("scheduleImpact")}
                description={t("scheduleImpactHint")}
                confirmLabel={t("confirmScheduleMove")}
                cancelLabel={flow("cancel")}
                pending={isSaving}
                onConfirm={() => save(impact?.confirmation)}
            >
                <ul className="mt-5 space-y-3">
                    {impact?.moves.map((move) => (
                        <li
                            key={move.from}
                            className="overflow-hidden rounded-xl border border-border/70 bg-muted/20"
                        >
                            <div className="border-b border-border/50 px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                                {t("affectedAssignments", {
                                    count: move.count,
                                })}
                            </div>
                            <dl className="space-y-4 p-4">
                                <div className="space-y-1">
                                    <dt className="text-xs text-muted-foreground">
                                        {t("oldMeetingTime")}
                                    </dt>
                                    <dd className="text-sm leading-6 text-muted-foreground">
                                        <bdi>
                                            {formatOccurrence(
                                                move.from,
                                                locale,
                                                meeting?.timezone ?? timezone,
                                            )}
                                        </bdi>
                                    </dd>
                                </div>
                                <div className="space-y-1 border-s-2 border-primary ps-3">
                                    <dt className="text-xs font-medium text-primary">
                                        {t("newMeetingTime")}
                                    </dt>
                                    <dd className="text-sm font-semibold leading-6">
                                        <bdi>
                                            {formatOccurrence(
                                                move.to,
                                                locale,
                                                timezone,
                                            )}
                                        </bdi>
                                    </dd>
                                </div>
                            </dl>
                        </li>
                    ))}
                </ul>
                <p className="mt-4 flex items-start gap-2 text-xs leading-6 text-muted-foreground">
                    <ShieldCheck
                        aria-hidden="true"
                        className="mt-1 size-4 shrink-0 text-primary"
                    />
                    {t("schedulePreserved")}
                </p>
            </ConfirmationDialog>
            {isAdmin && (
                <details
                    id="meeting-schedule"
                    open={scheduleOpen}
                    onToggle={(event) =>
                        setScheduleOpen(event.currentTarget.open)
                    }
                    className="group relative scroll-mt-24 bg-background/35"
                >
                    <summary className="flex cursor-pointer list-none items-center gap-2 border-primary/10 border-t px-4 py-4 text-sm font-semibold text-muted-foreground outline-none transition-colors hover:bg-background/35 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring sm:px-6 [&::-webkit-details-marker]:hidden">
                        <Settings2 className="size-4 text-primary" />
                        {flow("schedule")}
                        <ChevronDown className="ms-auto size-4 transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="grid gap-6 px-4 pb-6 pt-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-end">
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
                                    {isHost
                                        ? t("hostNoteSelf")
                                        : t("hostNote", {
                                              name:
                                                  meeting?.hostName ?? t("you"),
                                          })}
                                </p>
                            </div>
                            <Button
                                type="button"
                                disabled={isSaving}
                                onClick={() => save()}
                                className="w-full rounded-xl"
                            >
                                {isSaving && (
                                    <LoaderCircle className="size-4 animate-spin" />
                                )}
                                {t(isSaving ? "saving" : "save")}
                            </Button>
                            {meeting && (
                                <MeetingHostControl
                                    key={meeting.hostUserId}
                                    groupId={groupId}
                                    hostUserId={meeting.hostUserId}
                                    supervisors={supervisors}
                                />
                            )}
                        </div>
                    </div>
                </details>
            )}
        </section>
    );
}
