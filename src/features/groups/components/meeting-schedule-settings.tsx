"use client";
import {
    CalendarDays,
    ChevronDown,
    LoaderCircle,
    Repeat2,
    ShieldCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import AnchoredDetails from "@/components/anchored-details";
import { Button } from "@/components/ui/button";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import type {
    GroupMeetingDetails,
    MeetingOccurrenceState,
    MeetingScheduleSlot,
} from "../meeting-types";
import { getMeetingDisplayTimezone } from "../server/meeting-schedule";
import saveGroupMeeting from "../server/save-group-meeting";
import MeetingScheduleFields from "./meeting-schedule-fields";
import RescheduleMeeting from "./reschedule-meeting";

function formatOccurrence(value: string, locale: string, timezone: string) {
    const instant = new Date(value);
    return new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: getMeetingDisplayTimezone(timezone, instant),
    }).format(instant);
}

export default function MeetingScheduleSettings({
    groupId,
    meeting,
    state,
    locale,
}: {
    groupId: string;
    meeting: GroupMeetingDetails | null;
    state: MeetingOccurrenceState | null;
    locale: string;
}) {
    const t = useTranslations("Groups.meeting");
    const flow = useTranslations("Groups.flow");
    const router = useRouter();
    const [isSaving, setIsSaving] = useState(false);
    const [impact, setImpact] = useState<{
        confirmation: string;
        moves: Array<{ from: string; to: string; count: number }>;
    } | null>(null);
    const [schedule, setSchedule] = useState<MeetingScheduleSlot[]>(
        meeting?.schedule ?? [{ weekday: 1, localTime: "20:00" }],
    );
    const [timezone, setTimezone] = useState(meeting?.timezone ?? "");
    const active = state?.status === "active";
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

    return (
        <section
            id="meeting-settings"
            aria-labelledby="meeting-settings-title"
            className="scroll-mt-24 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm"
        >
            <div className="flex items-start gap-3 p-4 sm:gap-4 sm:p-5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <CalendarDays aria-hidden="true" className="size-5" />
                </span>
                <div className="min-w-0">
                    <h2
                        id="meeting-settings-title"
                        className="font-semibold leading-6"
                    >
                        {t("manageTimes")}
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {t(
                            !meeting
                                ? "setupTimesDescription"
                                : state?.status === "upcoming"
                                  ? "manageTimesDescription"
                                  : "manageWeeklyDescription",
                        )}
                    </p>
                </div>
            </div>
            <div className="space-y-3 border-t border-border/50 bg-muted/20 p-4 sm:p-5">
                {meeting &&
                    state?.status === "upcoming" &&
                    state.nextStartsAt && (
                        <RescheduleMeeting
                            key={state.nextStartsAt}
                            groupId={groupId}
                            startsAt={state.nextStartsAt}
                            timezone={meeting.timezone}
                        />
                    )}
                {active && (
                    <p className="rounded-xl border border-primary/15 bg-primary/5 p-3 text-sm leading-6">
                        {t("activeScheduleHint")}
                    </p>
                )}
                <AnchoredDetails
                    id="meeting-schedule"
                    defaultOpen={!meeting}
                    className="group/weekly scroll-mt-24 overflow-hidden rounded-xl border border-border/60 bg-card"
                >
                    <summary className="flex cursor-pointer list-none items-start gap-3 p-4 outline-none transition-colors hover:bg-muted/25 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                        <Repeat2
                            aria-hidden="true"
                            className="mt-1 size-5 shrink-0 text-primary"
                        />
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                                <h3 className="text-sm font-semibold leading-6">
                                    {t("scheduleTitle")}
                                </h3>
                                <span className="rounded-full bg-muted px-2 py-0.5 text-xs leading-5 text-muted-foreground">
                                    {t("recurringScope")}
                                </span>
                            </div>
                            <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                {t("recurringSummary")}
                            </p>
                        </div>
                        <ChevronDown
                            aria-hidden="true"
                            className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-open/weekly:rotate-180"
                        />
                    </summary>
                    <form
                        className="space-y-5 border-t border-border/50 p-4 sm:p-5"
                        onSubmit={(event) => {
                            event.preventDefault();
                            void save();
                        }}
                    >
                        {meeting && (
                            <div className="rounded-xl bg-muted/40 p-3 text-sm leading-6 text-muted-foreground">
                                {t("recurringImpact")}
                            </div>
                        )}
                        <MeetingScheduleFields
                            schedule={schedule}
                            setSchedule={setSchedule}
                            timezone={timezone}
                            setTimezone={setTimezone}
                            disabled={isSaving || active}
                            showHeading={false}
                        />
                        <div className="flex flex-col gap-3 border-t border-border/50 pt-4 sm:flex-row sm:items-center sm:justify-between">
                            {meeting && (
                                <p className="flex items-start gap-2 text-xs leading-6 text-muted-foreground">
                                    <ShieldCheck
                                        aria-hidden="true"
                                        className="mt-1 size-4 shrink-0 text-primary"
                                    />
                                    {t("progressPreserved")}
                                </p>
                            )}
                            <Button
                                type="submit"
                                disabled={isSaving || active}
                                className="min-h-11 shrink-0 rounded-xl sm:ms-auto"
                            >
                                {isSaving && (
                                    <LoaderCircle
                                        aria-hidden="true"
                                        className="size-4 animate-spin"
                                    />
                                )}
                                {t(isSaving ? "saving" : "saveWeekly")}
                            </Button>
                        </div>
                    </form>
                </AnchoredDetails>
            </div>
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
        </section>
    );
}
