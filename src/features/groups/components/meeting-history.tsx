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
import type { MeetingHistoryEntry } from "../server/get-meeting-history";
import { getMeetingDisplayTimezone } from "../server/meeting-schedule";
import reviewMeetingAbsence from "../server/review-meeting-absence";

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
}: {
    groupId: string;
    attendanceId: string;
    status: "pending" | "accepted" | "unaccepted";
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

    async function decide(decision: "accepted" | "unaccepted") {
        if (savingRef.current || savedDecision || status !== "pending") return;
        savingRef.current = true;
        setPendingDecision(decision);
        try {
            const result = await reviewMeetingAbsence({
                groupId,
                attendanceId,
                decision,
            });
            if (!result.success) {
                toast.error(
                    t(
                        result.reason === "already_reviewed"
                            ? "alreadyReviewed"
                            : "reviewError",
                    ),
                );
                router.refresh();
                return;
            }
            setSavedDecision(decision);
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
                onClick={() => decide("accepted")}
                className="h-8 rounded-lg"
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
                onClick={() => decide("unaccepted")}
                className="h-8 rounded-lg"
            >
                {pendingDecision === "unaccepted" ? (
                    <LoaderCircle className="size-3.5 animate-spin" />
                ) : (
                    <X className="size-3.5" />
                )}
                {t("rejectAbsence")}
            </Button>
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
                <div className="mt-5 rounded-2xl bg-muted/30 px-5 py-7 text-center ring-1 ring-border/50">
                    <CalendarDays className="mx-auto size-5 text-primary" />
                    <p className="mt-3 text-sm font-medium">{t("empty")}</p>
                </div>
            ) : (
                <div className="mt-5 space-y-2.5">
                    {history.map((session, index) => (
                        <details
                            key={session.id}
                            open={openFirst && index === 0}
                            className="group overflow-hidden rounded-2xl bg-muted/30 ring-1 ring-border/50"
                        >
                            <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-4 outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-5 [&::-webkit-details-marker]:hidden">
                                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-background text-primary shadow-sm ring-1 ring-border/40">
                                    <CalendarDays className="size-4" />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold sm:text-base">
                                        {formatDate(session.scheduledStartsAt)}
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

                            <div className="border-border/50 border-t px-4 py-3 sm:px-5">
                                {session.attendance.length > 0 ? (
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
                                                            />
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs font-medium text-muted-foreground sm:col-span-2">
                                                            {t(
                                                                `statuses.${attendance.status}`,
                                                            )}
                                                        </span>
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
