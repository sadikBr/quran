"use client";

import {
    CalendarDays,
    Check,
    ChevronDown,
    Clock3,
    History,
    LoaderCircle,
    Timer,
    UsersRound,
    X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import type { MeetingHistoryEntry } from "../server/get-meeting-history";
import { getMeetingDisplayTimezone } from "../server/meeting-schedule";
import reviewMeetingAbsence from "../server/review-meeting-absence";
import AbsenceExcuse from "./absence-excuse";

function formatDuration(totalSeconds: number, locale: string) {
    const totalMinutes = Math.max(0, Math.round(totalSeconds / 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const parts = [];
    if (hours > 0) parts.push(`${hours}${locale === "ar" ? "س" : "h"}`);
    if (minutes > 0 || hours === 0)
        parts.push(`${minutes}${locale === "ar" ? "د" : "m"}`);
    return parts.join(" ");
}

function AbsenceReview({
    groupId,
    attendanceId,
    status,
    excuse,
    name,
    meetingDate,
}: {
    groupId: string;
    attendanceId: string;
    status: "pending" | "accepted" | "unaccepted";
    excuse: string | null;
    name: string;
    meetingDate: string;
}) {
    const t = useTranslations("Groups.meeting.history");
    const router = useRouter();
    const [pendingDecision, setPendingDecision] = useState<
        "accepted" | "unaccepted" | null
    >(null);
    const [savedDecision, setSavedDecision] = useState<
        "accepted" | "unaccepted" | null
    >(null);
    const savingRef = useRef(false);
    const [confirmation, setConfirmation] = useState<{
        decision: "accepted" | "unaccepted";
        removal: boolean;
    } | null>(null);

    async function decide(
        decision: "accepted" | "unaccepted",
        confirmRemoval = false,
    ) {
        if (savingRef.current || savedDecision || status !== "pending") return;
        savingRef.current = true;
        setPendingDecision(decision);
        try {
            const result = await reviewMeetingAbsence({
                groupId,
                attendanceId,
                decision,
                expectedExcuse: excuse,
                confirmRemoval,
            });
            if (!result.success && result.reason === "removal_confirmation") {
                setConfirmation({ decision, removal: true });
                return;
            }
            if (!result.success) {
                setConfirmation(null);
                toast.error(
                    t(
                        result.reason === "already_reviewed"
                            ? "alreadyReviewed"
                            : result.reason === "excuse_changed"
                              ? "excuseChanged"
                              : "reviewError",
                    ),
                );
                router.refresh();
                return;
            }
            setSavedDecision(decision);
            setConfirmation(null);
            toast.success(t(result.removed ? "memberRemoved" : "reviewSaved"));
            router.refresh();
        } catch {
            toast.error(t("reviewError"));
        } finally {
            savingRef.current = false;
            setPendingDecision(null);
        }
    }

    const finalDecision = status !== "pending" ? status : savedDecision;
    if (finalDecision) {
        return (
            <div className="flex flex-wrap items-center gap-2 text-xs sm:justify-end">
                <span className="rounded-lg bg-muted px-2.5 py-1 font-medium">
                    {t(`statuses.${finalDecision}`)}
                </span>
                <span className="text-muted-foreground">
                    {t("decisionFinal")}
                </span>
            </div>
        );
    }

    return (
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pendingDecision !== null}
                onClick={() =>
                    setConfirmation({ decision: "accepted", removal: false })
                }
                className="min-h-11 rounded-lg px-3 sm:min-h-9"
            >
                {pendingDecision === "accepted" ? (
                    <LoaderCircle className="size-3.5 animate-spin" />
                ) : (
                    <Check className="size-3.5" />
                )}
                {t("acceptAbsence")}
            </Button>
            <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pendingDecision !== null}
                onClick={() =>
                    setConfirmation({ decision: "unaccepted", removal: false })
                }
                className="min-h-11 rounded-lg px-3 sm:min-h-9"
            >
                {pendingDecision === "unaccepted" ? (
                    <LoaderCircle className="size-3.5 animate-spin" />
                ) : (
                    <X className="size-3.5" />
                )}
                {t("rejectAbsence")}
            </Button>
            <ConfirmationDialog
                open={confirmation !== null}
                onOpenChange={(open) => {
                    if (!open) setConfirmation(null);
                }}
                title={t(
                    confirmation?.removal
                        ? "removalTitle"
                        : "confirmationTitle",
                )}
                description={
                    confirmation?.removal
                        ? t("confirmRemoval", { name, date: meetingDate })
                        : t("confirmAbsence", {
                              name,
                              date: meetingDate,
                              decision: t(
                                  `statuses.${confirmation?.decision ?? "accepted"}`,
                              ),
                          })
                }
                confirmLabel={t(
                    confirmation?.removal
                        ? "confirmRemovalButton"
                        : "confirmDecision",
                )}
                cancelLabel={t("cancelDecision")}
                destructive={confirmation?.decision === "unaccepted"}
                pending={pendingDecision !== null}
                onConfirm={() => {
                    if (confirmation)
                        void decide(
                            confirmation.decision,
                            confirmation.removal,
                        );
                }}
            >
                {excuse && (
                    <div className="mt-4 rounded-xl border bg-muted/30 p-4">
                        <p className="text-xs font-semibold text-muted-foreground">
                            {t("explainAbsence")}
                        </p>
                        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">
                            {excuse}
                        </p>
                    </div>
                )}
            </ConfirmationDialog>
        </div>
    );
}

export default function MeetingHistory({
    groupId,
    history,
    locale,
    timezone,
    isAdmin,
    viewAllHref,
    openFirst = false,
    showHeading = true,
}: {
    groupId: string;
    history: MeetingHistoryEntry[];
    locale: string;
    timezone: string;
    isAdmin: boolean;
    viewAllHref?: string;
    openFirst?: boolean;
    showHeading?: boolean;
}) {
    const t = useTranslations("Groups.meeting.history");
    const formatDate = (value: Date) =>
        new Intl.DateTimeFormat(locale, {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
            timeZone: getMeetingDisplayTimezone(timezone, value),
        }).format(value);
    const formatTime = (value: Date) =>
        new Intl.DateTimeFormat(locale, {
            hour: "numeric",
            minute: "2-digit",
            timeZone: getMeetingDisplayTimezone(timezone, value),
        }).format(value);

    return (
        <section className="mt-8">
            {showHeading && (
                <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <History className="size-5" />
                    </span>
                    <div>
                        <h2 className="text-lg font-semibold">{t("title")}</h2>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                            {t(
                                isAdmin
                                    ? "descriptionAdmin"
                                    : "descriptionMember",
                            )}
                        </p>
                    </div>
                </div>
            )}

            {history.length === 0 ? (
                <div className="app-card mt-5 px-5 py-7 text-center">
                    <CalendarDays className="mx-auto size-5 text-primary" />
                    <p className="mt-3 text-sm font-medium">{t("empty")}</p>
                </div>
            ) : (
                <div className="mt-5 space-y-2.5">
                    {history.map((session, index) => (
                        <details
                            key={session.id}
                            open={openFirst && index === 0}
                            className="app-card group overflow-hidden"
                        >
                            <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-4 outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-5 [&::-webkit-details-marker]:hidden">
                                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                    <CalendarDays className="size-4" />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold leading-6 sm:text-base">
                                        {formatDate(session.scheduledStartsAt)}
                                        {session.cancelledAt && (
                                            <span className="ms-2 inline-flex rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground ring-1 ring-border">
                                                {t("cancelled")}
                                            </span>
                                        )}
                                    </p>
                                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                        <span className="inline-flex items-center gap-1.5">
                                            <Clock3 className="size-3.5" />
                                            {session.startedAt
                                                ? t("startedAt", {
                                                      time: formatTime(
                                                          session.startedAt,
                                                      ),
                                                  })
                                                : t("notStarted")}
                                        </span>
                                        {session.startedAt && (
                                            <span className="inline-flex items-center gap-1.5">
                                                <Timer className="size-3.5" />
                                                {formatDuration(
                                                    session.durationSeconds,
                                                    locale,
                                                )}
                                            </span>
                                        )}
                                        <span className="inline-flex items-center gap-1.5">
                                            <UsersRound className="size-3.5" />
                                            {t("participants", {
                                                count: session.participantCount,
                                            })}
                                        </span>
                                    </div>
                                </div>
                                <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                            </summary>

                            <div className="app-card-body py-3 sm:py-3">
                                {session.cancelledAt ? (
                                    <p className="py-2 text-sm leading-6 text-muted-foreground">
                                        {t("cancelledDescription")}
                                    </p>
                                ) : session.attendance.length > 0 ? (
                                    <div className="divide-y divide-border/50">
                                        {session.attendance.map(
                                            (attendance) => (
                                                <div
                                                    key={attendance.id}
                                                    className="grid gap-2 py-3 text-sm sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:gap-6"
                                                >
                                                    <span className="font-medium">
                                                        {isAdmin
                                                            ? attendance.name
                                                            : t("you")}
                                                    </span>
                                                    {attendance.status ===
                                                    "present" ? (
                                                        <>
                                                            <span className="text-xs text-muted-foreground">
                                                                {t("joinedAt", {
                                                                    time: formatTime(
                                                                        attendance.joinedAt as Date,
                                                                    ),
                                                                })}
                                                            </span>
                                                            <span className="w-fit rounded-lg bg-primary/8 px-2.5 py-1 text-xs font-semibold text-primary">
                                                                {formatDuration(
                                                                    attendance.durationSeconds,
                                                                    locale,
                                                                )}
                                                            </span>
                                                        </>
                                                    ) : isAdmin ? (
                                                        <div className="sm:col-span-2">
                                                            <AbsenceReview
                                                                groupId={
                                                                    groupId
                                                                }
                                                                attendanceId={
                                                                    attendance.id
                                                                }
                                                                status={
                                                                    attendance.status
                                                                }
                                                                excuse={
                                                                    attendance.excuse
                                                                }
                                                                name={
                                                                    attendance.name
                                                                }
                                                                meetingDate={formatDate(
                                                                    session.scheduledStartsAt,
                                                                )}
                                                            />
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs font-medium text-muted-foreground sm:col-span-2">
                                                            {t(
                                                                `statuses.${attendance.status}`,
                                                            )}
                                                        </span>
                                                    )}
                                                    {attendance.status !==
                                                        "present" && (
                                                        <div className="col-span-full mt-3 rounded-xl border bg-background/40 p-4">
                                                            {isAdmin ? (
                                                                <>
                                                                    <p className="mb-2 text-xs font-semibold text-muted-foreground">
                                                                        {t(
                                                                            "explainAbsence",
                                                                        )}
                                                                    </p>
                                                                    <p className="whitespace-pre-wrap break-words text-sm">
                                                                        {attendance.excuse ||
                                                                            t(
                                                                                "noExcuse",
                                                                            )}
                                                                    </p>
                                                                </>
                                                            ) : (
                                                                <AbsenceExcuse
                                                                    groupId={
                                                                        groupId
                                                                    }
                                                                    attendanceId={
                                                                        attendance.id
                                                                    }
                                                                    excuse={
                                                                        attendance.excuse
                                                                    }
                                                                    pending={
                                                                        attendance.status ===
                                                                        "pending"
                                                                    }
                                                                />
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            ),
                                        )}
                                    </div>
                                ) : (
                                    <p className="py-2 text-sm text-muted-foreground">
                                        {t("notAttended")}
                                    </p>
                                )}
                            </div>
                        </details>
                    ))}
                </div>
            )}

            {viewAllHref && history.length > 0 && (
                <Button
                    asChild
                    variant="outline"
                    className="mt-4 w-full rounded-xl sm:w-auto"
                >
                    <Link href={viewAllHref}>
                        <History className="size-4" />
                        {t("viewAll")}
                    </Link>
                </Button>
            )}
        </section>
    );
}
