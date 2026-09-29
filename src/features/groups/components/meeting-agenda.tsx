"use client";

import {
    ArrowLeft,
    ArrowRight,
    BookOpenCheck,
    CheckCircle2,
    ChevronDown,
    CircleDot,
    ClipboardCheck,
    Clock3,
    Headphones,
    UserCheck,
    UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type {
    MeetingAgendaAssignment,
    MeetingAgendaData,
} from "@/features/groups/server/get-meeting-agenda";
import { getMeetingDisplayTimezone } from "@/features/groups/server/meeting-schedule";
import { cn } from "@/lib/utils";

function initials(name: string) {
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase();
}

export default function MeetingAgenda({
    groupId,
    agenda,
    currentUserId,
    isAdmin,
    locale,
    timezone,
    surahNames,
    embedded = false,
}: {
    groupId: string;
    agenda: MeetingAgendaData;
    currentUserId: string;
    isAdmin: boolean;
    locale: string;
    timezone: string;
    surahNames: Record<number, string>;
    embedded?: boolean;
}) {
    const t = useTranslations("Groups.meeting.agenda");
    const assignmentsT = useTranslations("Groups.assignments");
    const router = useRouter();
    const isArabic = locale === "ar";
    const DirectionArrow = isArabic ? ArrowLeft : ArrowRight;

    useEffect(() => {
        if (!agenda.active) return;
        const interval = window.setInterval(() => router.refresh(), 30_000);
        return () => window.clearInterval(interval);
    }, [agenda.active, router]);

    const occurrence = new Date(agenda.occurrenceStartsAt);
    const formattedOccurrence = new Intl.DateTimeFormat(locale, {
        weekday: "long",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: getMeetingDisplayTimezone(timezone, occurrence),
    }).format(occurrence);

    function rangeLabel(assignment: MeetingAgendaAssignment) {
        const startSurah = surahNames[assignment.startSurahNumber];
        const endSurah = surahNames[assignment.endSurahNumber];
        if (assignment.startSurahNumber === assignment.endSurahNumber) {
            return t("sameSurahRange", {
                surah: startSurah,
                start: assignment.startAyahNumber,
                end: assignment.endAyahNumber,
            });
        }
        return t("crossSurahRange", {
            startSurah,
            start: assignment.startAyahNumber,
            endSurah,
            end: assignment.endAyahNumber,
        });
    }

    return (
        <section
            className={cn(
                "overflow-hidden",
                embedded
                    ? "border-primary/10 border-t bg-background/20"
                    : "mt-8 rounded-3xl bg-muted/25 ring-1 ring-border/55",
            )}
        >
            <div
                className={cn(
                    "flex flex-col gap-4 border-border/50 border-b px-4 sm:px-6",
                    !embedded && "lg:flex-row lg:items-end lg:justify-between",
                    embedded ? "py-5" : "py-6",
                )}
            >
                <div>
                    {!embedded && (
                        <div className="flex flex-wrap items-center gap-2">
                            <p className="text-xs font-bold tracking-[0.14em] text-primary uppercase">
                                {t(agenda.active ? "liveEyebrow" : "eyebrow")}
                            </p>
                            <span
                                className={cn(
                                    "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[0.7rem] font-semibold",
                                    agenda.active
                                        ? "bg-primary/10 text-primary"
                                        : "bg-background/70 text-muted-foreground ring-1 ring-border/50",
                                )}
                            >
                                <CircleDot
                                    className={cn(
                                        "size-3",
                                        agenda.active && "animate-pulse",
                                    )}
                                />
                                {t(agenda.active ? "live" : "upcoming")}
                            </span>
                        </div>
                    )}
                    <h2
                        className={cn(
                            "font-semibold tracking-tight",
                            embedded
                                ? "text-lg sm:text-xl"
                                : "mt-2 text-xl sm:text-2xl",
                        )}
                    >
                        {t("title")}
                    </h2>
                    {!embedded && (
                        <p className="mt-1.5 text-sm text-muted-foreground">
                            {formattedOccurrence}
                        </p>
                    )}
                </div>

                <div
                    className={cn(
                        "grid grid-cols-3 gap-2 text-center",
                        embedded && "max-w-xl",
                    )}
                >
                    <AgendaStat
                        icon={ClipboardCheck}
                        value={agenda.readyCount}
                        label={t("ready")}
                    />
                    <AgendaStat
                        icon={BookOpenCheck}
                        value={agenda.assignmentCount}
                        label={t("assignments")}
                    />
                    <AgendaStat
                        icon={UsersRound}
                        value={
                            agenda.active
                                ? agenda.presentCount
                                : agenda.members.length
                        }
                        label={agenda.active ? t("present") : t("members")}
                    />
                </div>
            </div>

            <div className="divide-y divide-border/45">
                {agenda.members.map((member) => {
                    const isCurrentUser = member.userId === currentUserId;
                    return (
                        <details
                            key={member.userId}
                            className="group/member bg-background/15 open:bg-background/45"
                            open={
                                agenda.active &&
                                (member.queuePosition === 1 ||
                                    (isCurrentUser &&
                                        member.assignments.length > 0))
                            }
                        >
                            <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-4 outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-6 [&::-webkit-details-marker]:hidden">
                                <Avatar className="size-10 shrink-0 border border-primary/15">
                                    {member.image && (
                                        <AvatarImage
                                            src={member.image}
                                            alt=""
                                        />
                                    )}
                                    <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                                        {initials(member.name)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="truncate text-sm font-semibold sm:text-base">
                                            {member.name}
                                        </h3>
                                        {isCurrentUser && (
                                            <span className="text-[0.7rem] text-primary">
                                                {t("you")}
                                            </span>
                                        )}
                                    </div>
                                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                        {t("assignmentCount", {
                                            count: member.assignments.length,
                                        })}
                                    </p>
                                </div>

                                {member.queuePosition !== null && (
                                    <span className="hidden rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary sm:inline-flex">
                                        {t("queuePosition", {
                                            position: member.queuePosition,
                                        })}
                                    </span>
                                )}
                                {agenda.active && (
                                    <span
                                        className={cn(
                                            "hidden items-center gap-1.5 text-xs sm:inline-flex",
                                            member.attendance === "present"
                                                ? "text-emerald-700 dark:text-emerald-400"
                                                : "text-muted-foreground",
                                        )}
                                    >
                                        {member.attendance === "present" ? (
                                            <UserCheck className="size-3.5" />
                                        ) : (
                                            <Clock3 className="size-3.5" />
                                        )}
                                        {t(
                                            member.attendance === "present"
                                                ? "attendance.present"
                                                : "attendance.waiting",
                                        )}
                                    </span>
                                )}
                                <ChevronDown
                                    aria-hidden="true"
                                    className="ms-auto size-4 shrink-0 text-muted-foreground transition-transform group-open/member:rotate-180"
                                />
                            </summary>

                            <div className="border-border/45 border-t px-5 py-4 sm:px-8">
                                {member.assignments.length > 0 ? (
                                    <div className="grid gap-2">
                                        {member.assignments.map(
                                            (assignment) => (
                                                <article
                                                    key={assignment.id}
                                                    className="flex flex-col gap-3 rounded-xl bg-background/70 p-3.5 ring-1 ring-border/45 sm:flex-row sm:items-center"
                                                >
                                                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                                        {assignment.status ===
                                                        "completed" ? (
                                                            <CheckCircle2 className="size-4" />
                                                        ) : (
                                                            <Headphones className="size-4" />
                                                        )}
                                                    </span>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <p className="text-sm font-semibold">
                                                                {assignmentsT(
                                                                    `kinds.${assignment.kind}`,
                                                                )}
                                                            </p>
                                                            <span
                                                                className={cn(
                                                                    "rounded-md px-2 py-0.5 text-[0.68rem] font-medium",
                                                                    assignment.status ===
                                                                        "submitted"
                                                                        ? "bg-primary/10 text-primary"
                                                                        : assignment.status ===
                                                                            "completed"
                                                                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                                                          : "bg-muted text-muted-foreground",
                                                                )}
                                                            >
                                                                {assignmentsT(
                                                                    `statuses.${assignment.status}`,
                                                                )}
                                                            </span>
                                                        </div>
                                                        <p className="mt-1 text-xs text-muted-foreground">
                                                            {rangeLabel(
                                                                assignment,
                                                            )}
                                                        </p>
                                                    </div>

                                                    {isAdmin &&
                                                        assignment.status ===
                                                            "submitted" && (
                                                            <Button
                                                                asChild
                                                                size="sm"
                                                                className="rounded-lg"
                                                            >
                                                                <Link
                                                                    href={`/groups/${groupId}/review/${assignment.id}`}
                                                                >
                                                                    <ClipboardCheck className="size-4" />
                                                                    {t(
                                                                        "review",
                                                                    )}
                                                                </Link>
                                                            </Button>
                                                        )}
                                                    {isCurrentUser &&
                                                        assignment.status !==
                                                            "completed" &&
                                                        assignment.status !==
                                                            "submitted" && (
                                                            <Button
                                                                asChild
                                                                size="sm"
                                                                variant="ghost"
                                                                className="rounded-lg text-primary hover:text-primary"
                                                            >
                                                                <Link
                                                                    href={`/practice/${assignment.id}/read`}
                                                                >
                                                                    {t(
                                                                        "openPractice",
                                                                    )}
                                                                    <DirectionArrow className="size-4" />
                                                                </Link>
                                                            </Button>
                                                        )}
                                                </article>
                                            ),
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">
                                        {t("noAssignmentDescription")}
                                    </p>
                                )}
                            </div>
                        </details>
                    );
                })}
            </div>
        </section>
    );
}

function AgendaStat({
    icon: Icon,
    value,
    label,
}: {
    icon: typeof ClipboardCheck;
    value: number;
    label: string;
}) {
    return (
        <div className="min-w-0 rounded-xl bg-background/70 px-3 py-2.5 ring-1 ring-border/45 sm:min-w-24">
            <div className="flex items-center justify-center gap-1.5">
                <Icon className="size-3.5 text-primary" />
                <strong className="text-sm">{value}</strong>
            </div>
            <p className="mt-1 text-[0.7rem] leading-5 text-muted-foreground">
                {label}
            </p>
        </div>
    );
}
