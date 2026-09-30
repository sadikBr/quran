import {
    ArrowRight,
    BookMarked,
    CalendarCheck2,
    CalendarClock,
    CheckCircle2,
    ChevronDown,
    CirclePlus,
    ClipboardCheck,
    History,
    RefreshCcw,
} from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createTranslator } from "next-intl";
import PageBackground from "@/components/page-background";
import StickyAppHeader from "@/components/sticky-app-header";
import { Button } from "@/components/ui/button";
import { auth } from "@/features/auth/auth";
import AssignmentReadyButton from "@/features/groups/components/assignment-ready-button";
import DeleteAssignmentButton from "@/features/groups/components/delete-assignment-button";
import MemberAssignmentForm from "@/features/groups/components/member-assignment-form";
import { canReviewAssignment } from "@/features/groups/review-eligibility";
import getGroupAssignments from "@/features/groups/server/get-group-assignments";
import { getGroupMeetingForUser } from "@/features/groups/server/get-group-meeting";
import {
    getGroupForUser,
    getGroupsForUser,
} from "@/features/groups/server/get-groups";
import getMemberAssignments, {
    type MemberAssignment,
} from "@/features/groups/server/get-member-assignments";
import {
    calculateMeetingState,
    getMeetingDisplayTimezone,
    getUpcomingMeetingOccurrences,
} from "@/features/groups/server/meeting-schedule";
import getQuranNavigationMeta from "@/features/quran/server/get-quran-navigation-meta";
import getSurahsMeta from "@/features/quran/server/get-surahs-meta";
import {
    getWarshChapters,
    getWarshNavigationMeta,
} from "@/features/quran/server/get-warsh-mushaf";
import getPreferences from "@/features/settings/server/get-preferences";
import { getMessages, getTextDirection } from "@/i18n/config";
import { cn } from "@/lib/utils";

interface MeetingAssignmentGroup {
    key: string;
    dueAt: Date | null;
    groupId: string | null;
    groupName: string | null;
    timezone: string | null;
    assignments: MemberAssignment[];
}

export default async function AssignmentsPage({
    searchParams,
}: {
    searchParams: Promise<{ view?: string; group?: string }>;
}) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) redirect("/sign-in");

    const [query, preferences, memberWork, groups] = await Promise.all([
        searchParams,
        getPreferences(),
        getMemberAssignments(session.user.id),
        getGroupsForUser(session.user.id),
    ]);
    const adminGroups = groups.filter((group) => group.role === "supervisor");
    const filteredGroup = groups.find((group) => group.id === query.group);
    const requestedAdminGroup = adminGroups.find(
        (group) => group.id === query.group,
    );
    const selectedAdminGroup = requestedAdminGroup ?? adminGroups[0] ?? null;
    const isManageView = query.view === "manage" && selectedAdminGroup !== null;
    const filteredAssignments =
        query.group && !isManageView
            ? memberWork.assignments.filter(
                  (assignment) => assignment.groupId === query.group,
              )
            : memberWork.assignments;
    const [selectedGroupDetails, selectedGroupAssignments, selectedMeeting] =
        isManageView && selectedAdminGroup
            ? await Promise.all([
                  getGroupForUser(selectedAdminGroup.id, session.user.id),
                  getGroupAssignments(
                      selectedAdminGroup.id,
                      session.user.id,
                      true,
                  ),
                  getGroupMeetingForUser(
                      selectedAdminGroup.id,
                      session.user.id,
                  ),
              ])
            : [null, [], null];
    const [surahs, warshChapters, hafsNavigation, warshNavigation] =
        isManageView
            ? await Promise.all([
                  getSurahsMeta(),
                  getWarshChapters(),
                  getQuranNavigationMeta(),
                  getWarshNavigationMeta(),
              ])
            : [[], [], null, null];
    const messages = await getMessages(preferences.language);
    const t = createTranslator({
        locale: preferences.language,
        messages,
        namespace: "Assignments",
    });
    const groupsT = createTranslator({
        locale: preferences.language,
        messages,
        namespace: "Groups",
    });
    const isArabic = preferences.language === "ar";
    const now = new Date();
    const memberMeetingStates = new Map(
        await Promise.all(
            [
                ...new Set(
                    filteredAssignments.map((assignment) => assignment.groupId),
                ),
            ]
                .filter((id): id is string => Boolean(id))
                .map(async (id) => {
                    const meeting = await getGroupMeetingForUser(
                        id,
                        session.user.id,
                    );
                    return [
                        id,
                        meeting
                            ? calculateMeetingState({ ...meeting, now })
                            : null,
                    ] as const;
                }),
        ),
    );
    const totalAyahs = filteredAssignments.reduce(
        (total, assignment) => total + assignment.totalAyahs,
        0,
    );
    const completedAyahs = filteredAssignments.reduce(
        (total, assignment) => total + assignment.completedAyahs,
        0,
    );
    const overallPercentage = totalAyahs
        ? Math.round((completedAyahs / totalAyahs) * 100)
        : 0;
    const readyCount = filteredAssignments.filter(
        (assignment) => assignment.status === "submitted",
    ).length;
    const surahName = (number: number) => {
        const surah = memberWork.surahs.find((item) => item.number === number);
        return isArabic ? surah?.name : surah?.englishName;
    };
    const meetingGroups = Array.from(
        filteredAssignments.reduce((groups, assignment) => {
            const key = assignment.dueAt
                ? `${assignment.groupId ?? "group"}:${assignment.dueAt.toISOString()}`
                : `${assignment.groupId ?? "group"}:unscheduled`;
            const existing = groups.get(key);

            if (existing) {
                existing.assignments.push(assignment);
            } else {
                groups.set(key, {
                    key,
                    dueAt: assignment.dueAt,
                    groupId: assignment.groupId,
                    groupName: assignment.groupName,
                    timezone: assignment.meetingTimezone,
                    assignments: [assignment],
                });
            }

            return groups;
        }, new Map<string, MeetingAssignmentGroup>()),
    )
        .map(([, group]) => group)
        .sort((first, second) => {
            if (!first.dueAt) return 1;
            if (!second.dueAt) return -1;
            const firstOverdue = first.dueAt < now;
            const secondOverdue = second.dueAt < now;

            if (firstOverdue !== secondOverdue) return firstOverdue ? -1 : 1;
            return firstOverdue
                ? second.dueAt.getTime() - first.dueAt.getTime()
                : first.dueAt.getTime() - second.dueAt.getTime();
        });

    const formatMeetingDate = (group: MeetingAssignmentGroup) => {
        if (!group.dueAt) return t("meeting.unscheduled");

        return new Intl.DateTimeFormat(preferences.language, {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
            timeZone: group.timezone
                ? getMeetingDisplayTimezone(group.timezone, group.dueAt)
                : "UTC",
        }).format(group.dueAt);
    };
    const nextMeetingKey = meetingGroups.find(
        (group) => group.dueAt && group.dueAt >= now,
    )?.key;
    const activeAdminAssignments = selectedGroupAssignments.filter(
        (assignment) => assignment.status !== "completed",
    );
    const reviewQueue = activeAdminAssignments
        .filter((assignment) => assignment.status === "submitted")
        .sort(
            (a, b) =>
                (a.submittedAt?.getTime() ?? Infinity) -
                    (b.submittedAt?.getTime() ?? Infinity) ||
                a.id.localeCompare(b.id),
        );
    const currentAdminAssignments = activeAdminAssignments.filter(
        (assignment) => assignment.status !== "submitted",
    );
    const completedAdminAssignments = selectedGroupAssignments
        .filter((assignment) => assignment.status === "completed")
        .sort(
            (first, second) =>
                (second.reviewedAt?.getTime() ?? 0) -
                (first.reviewedAt?.getTime() ?? 0),
        );
    const plannedMemberCount = new Set(
        activeAdminAssignments.map((assignment) => assignment.assigneeId),
    ).size;
    const meetingOptions = selectedMeeting
        ? getUpcomingMeetingOccurrences({ ...selectedMeeting, limit: 12 }).map(
              (startsAt) => {
                  const startsAtDate = new Date(startsAt);
                  return {
                      startsAt,
                      label: new Intl.DateTimeFormat(preferences.language, {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                          timeZone: getMeetingDisplayTimezone(
                              selectedMeeting.timezone,
                              startsAtDate,
                          ),
                      }).format(startsAtDate),
                  };
              },
          )
        : [];
    const warshCounts = new Map(
        warshChapters.map((chapter) => [chapter.id, chapter.verses.length]),
    );
    const assignmentSurahs = surahs.map((surah) => ({
        number: surah.number,
        name: surah.name,
        englishName: surah.englishName,
        hafsAyahCount: surah.numberOfAyahs,
        warshAyahCount: warshCounts.get(surah.number) ?? surah.numberOfAyahs,
    }));
    const adminSurahName = (surahNumber: number) => {
        const surah = surahs.find((item) => item.number === surahNumber);
        return isArabic ? surah?.name : surah?.englishName;
    };
    const formatAdminDueAt = (dueAt: Date | null) =>
        dueAt
            ? new Intl.DateTimeFormat(preferences.language, {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone: selectedMeeting
                      ? getMeetingDisplayTimezone(
                            selectedMeeting.timezone,
                            dueAt,
                        )
                      : "UTC",
              }).format(dueAt)
            : t("meeting.unscheduled");

    function assignmentCard(assignment: MemberAssignment) {
        const Icon =
            assignment.kind === "memorization" ? BookMarked : RefreshCcw;
        return (
            <article
                key={assignment.id}
                className="min-w-0 rounded-2xl border border-border/60 bg-card p-4 shadow-sm sm:p-5"
            >
                <div className="flex items-start justify-between gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Icon aria-hidden="true" className="size-5" />
                    </span>
                    <span
                        className={cn(
                            "rounded-md px-2.5 py-1 text-xs font-medium",
                            assignment.status === "needs_revision"
                                ? "bg-amber-500/10 text-amber-800 dark:text-amber-300"
                                : assignment.status === "completed"
                                  ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                                  : assignment.status === "submitted"
                                    ? "bg-primary/10 text-primary"
                                    : "bg-muted/60 text-muted-foreground",
                        )}
                    >
                        {t(`card.statuses.${assignment.status}`)}
                    </span>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-primary">
                    <span>{t(`card.kinds.${assignment.kind}`)}</span>
                </div>
                <h3 className="mt-1 break-words text-base font-semibold leading-7">
                    {t("card.range", {
                        startSurah:
                            surahName(assignment.start.surahNumber) ??
                            assignment.start.surahNumber,
                        startAyah: assignment.start.ayahNumber,
                        endSurah:
                            surahName(assignment.end.surahNumber) ??
                            assignment.end.surahNumber,
                        endAyah: assignment.end.ayahNumber,
                    })}
                </h3>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
                    {assignment.assignedByName && (
                        <span>
                            {t("card.assignedBy", {
                                name: assignment.assignedByName,
                            })}
                        </span>
                    )}
                </div>

                {assignment.instructions && (
                    <p className="mt-4 rounded-xl bg-background/55 px-4 py-3 text-sm leading-6 text-muted-foreground">
                        {assignment.instructions}
                    </p>
                )}

                {assignment.reviewNote && (
                    <div className="mt-4 rounded-xl bg-primary/[0.07] px-4 py-3 ring-1 ring-primary/10">
                        <p className="text-xs font-semibold text-primary">
                            {t("card.feedback")}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                            {assignment.reviewNote}
                        </p>
                    </div>
                )}

                <div className="mt-5">
                    <div className="flex items-center justify-between gap-4 text-xs">
                        <span className="text-muted-foreground">
                            {t("card.progress", {
                                completed: assignment.completedAyahs,
                                total: assignment.totalAyahs,
                            })}
                        </span>
                        <strong className="text-primary">
                            {assignment.percentage}%
                        </strong>
                    </div>
                    <div
                        role="progressbar"
                        aria-label={t("card.progress", {
                            completed: assignment.completedAyahs,
                            total: assignment.totalAyahs,
                        })}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={assignment.percentage}
                        className="mt-2 h-1.5 overflow-hidden rounded-full bg-background/80"
                    >
                        <div
                            className="h-full rounded-full bg-primary transition-[width]"
                            style={{ width: `${assignment.percentage}%` }}
                        />
                    </div>
                </div>

                <Button
                    asChild
                    variant={
                        assignment.status === "submitted"
                            ? "outline"
                            : "default"
                    }
                    className="mt-5 w-full rounded-xl sm:w-auto"
                >
                    <Link
                        data-tour="assignment-practice"
                        href={`/practice/${assignment.id}/read`}
                    >
                        {assignment.status === "submitted"
                            ? groupsT("flow.continue")
                            : assignment.progress
                              ? t("card.continue")
                              : t("card.start")}
                        <ArrowRight
                            className={cn("size-4", isArabic && "rotate-180")}
                        />
                    </Link>
                </Button>
                {["in_progress", "needs_revision", "not_completed"].includes(
                    assignment.status,
                ) && <AssignmentReadyButton assignmentId={assignment.id} />}
            </article>
        );
    }

    return (
        <main
            data-tour="assignments-page"
            lang={preferences.language}
            dir={getTextDirection(preferences.language)}
            className={cn(
                "relative isolate min-h-dvh overflow-x-clip bg-background",
                isArabic && "arabic-ui",
            )}
        >
            <PageBackground />
            <div className="app-container ">
                <StickyAppHeader
                    navigation
                    className="-mx-4 px-4 sm:-mx-6 sm:px-6"
                />

                <section className="pb-12 pt-5 sm:pb-16 sm:pt-8">
                    <div>
                        <div className="border-b border-border/60 pb-6 sm:pb-8">
                            <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
                                {t(isManageView ? "admin.eyebrow" : "eyebrow")}
                            </p>
                            <h1 className="mt-2 text-3xl font-semibold leading-snug tracking-tight sm:text-4xl">
                                {t(isManageView ? "admin.title" : "title")}
                            </h1>
                            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                                {t(
                                    isManageView
                                        ? "admin.description"
                                        : "description",
                                )}
                            </p>
                        </div>

                        {adminGroups.length > 0 && (
                            <nav
                                aria-label={t("tabs.label")}
                                className="mt-6 grid grid-cols-2 gap-1 rounded-xl border border-border/60 bg-muted/30 p-1 sm:w-fit sm:min-w-96"
                            >
                                <Link
                                    href="/assignments"
                                    aria-current={
                                        !isManageView ? "page" : undefined
                                    }
                                    className={cn(
                                        "rounded-xl px-4 py-2.5 text-center text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                                        !isManageView
                                            ? "bg-background text-foreground shadow-sm"
                                            : "text-muted-foreground hover:text-foreground",
                                    )}
                                >
                                    {t("tabs.mine")}
                                </Link>
                                <Link
                                    href={`/assignments?view=manage&group=${selectedAdminGroup?.id ?? ""}`}
                                    aria-current={
                                        isManageView ? "page" : undefined
                                    }
                                    className={cn(
                                        "rounded-xl px-4 py-2.5 text-center text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                                        isManageView
                                            ? "bg-background text-foreground shadow-sm"
                                            : "text-muted-foreground hover:text-foreground",
                                    )}
                                >
                                    {t("tabs.manage")}
                                </Link>
                            </nav>
                        )}

                        {!isManageView && (
                            <>
                                {filteredGroup && (
                                    <div className="mt-6 flex flex-col gap-3 rounded-2xl bg-primary/[0.055] px-4 py-3 ring-1 ring-primary/12 sm:flex-row sm:items-center sm:justify-between">
                                        <p className="text-sm text-muted-foreground">
                                            {t("filtering", {
                                                group: filteredGroup.name,
                                            })}
                                        </p>
                                        <Button
                                            asChild
                                            variant="ghost"
                                            size="sm"
                                            className="w-full rounded-xl sm:w-auto"
                                        >
                                            <Link href="/assignments">
                                                {t("showAll")}
                                            </Link>
                                        </Button>
                                    </div>
                                )}
                                <div className="mt-7 grid items-center gap-4 border-border/50 border-y py-4 sm:grid-cols-[auto_minmax(8rem,1fr)_auto] sm:gap-6">
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold text-primary">
                                        <span className="inline-flex items-center gap-2">
                                            <CalendarClock className="size-4" />
                                            {t("summary.meetings", {
                                                count: meetingGroups.length,
                                            })}
                                        </span>
                                        {filteredAssignments.length > 0 && (
                                            <span className="text-muted-foreground">
                                                {t("summary.active", {
                                                    count: filteredAssignments.length,
                                                })}
                                            </span>
                                        )}
                                        {readyCount > 0 && (
                                            <span className="inline-flex items-center gap-1.5">
                                                <CheckCircle2 className="size-3.5" />
                                                {t("summary.ready", {
                                                    count: readyCount,
                                                })}
                                            </span>
                                        )}
                                    </div>
                                    <div
                                        role="progressbar"
                                        aria-label={t("summary.progress")}
                                        aria-valuemin={0}
                                        aria-valuemax={100}
                                        aria-valuenow={overallPercentage}
                                        className="h-1.5 overflow-hidden rounded-full bg-primary/10"
                                    >
                                        <div
                                            className="h-full rounded-full bg-primary"
                                            style={{
                                                width: `${overallPercentage}%`,
                                            }}
                                        />
                                    </div>
                                    <strong className="text-2xl font-semibold text-primary tabular-nums sm:text-end">
                                        {overallPercentage}%
                                    </strong>
                                </div>
                            </>
                        )}
                    </div>

                    {!isManageView &&
                        (filteredAssignments.length > 0 ? (
                            <section className="mt-9 space-y-3 sm:mt-12">
                                {meetingGroups.map((group, index) => {
                                    const meetingState = group.groupId
                                        ? memberMeetingStates.get(group.groupId)
                                        : null;
                                    const isActive = Boolean(
                                        group.dueAt &&
                                            meetingState?.activeStartsAt &&
                                            group.dueAt.getTime() ===
                                                new Date(
                                                    meetingState.activeStartsAt,
                                                ).getTime(),
                                    );
                                    const isOverdue = Boolean(
                                        group.dueAt &&
                                            group.dueAt < now &&
                                            !isActive,
                                    );
                                    const ready = group.assignments.filter(
                                        (assignment) =>
                                            assignment.status === "submitted",
                                    ).length;
                                    const completed = group.assignments.reduce(
                                        (total, assignment) =>
                                            total + assignment.completedAyahs,
                                        0,
                                    );
                                    const total = group.assignments.reduce(
                                        (sum, assignment) =>
                                            sum + assignment.totalAyahs,
                                        0,
                                    );
                                    const percentage = total
                                        ? Math.round((completed / total) * 100)
                                        : 0;

                                    return (
                                        <details
                                            key={group.key}
                                            className={cn(
                                                "group/meeting overflow-hidden rounded-2xl border border-border/60 bg-card/70 shadow-sm",
                                                isOverdue &&
                                                    "ring-destructive/20",
                                            )}
                                            open={
                                                index === 0 ||
                                                group.key === nextMeetingKey ||
                                                ready > 0
                                            }
                                        >
                                            <summary className="relative grid grid-cols-[auto_minmax(0,1fr)_auto] items-center cursor-pointer list-none gap-3 px-4 py-4 outline-none transition-colors hover:bg-muted/25 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:grid-cols-[auto_minmax(0,1fr)_auto_auto] sm:px-5 [&::-webkit-details-marker]:hidden">
                                                <span
                                                    className={cn(
                                                        "flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary",
                                                        isOverdue &&
                                                            "bg-destructive/10 text-destructive",
                                                    )}
                                                >
                                                    <CalendarCheck2 className="size-5" />
                                                </span>
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                                                        <span
                                                            className={cn(
                                                                "text-primary",
                                                                isOverdue &&
                                                                    "text-destructive",
                                                            )}
                                                        >
                                                            {t(
                                                                group.dueAt
                                                                    ? isActive
                                                                        ? "meeting.active"
                                                                        : isOverdue
                                                                          ? "meeting.closed"
                                                                          : group.key ===
                                                                              nextMeetingKey
                                                                            ? "meeting.next"
                                                                            : "meeting.later"
                                                                    : "meeting.unscheduledLabel",
                                                            )}
                                                        </span>
                                                        {group.groupName && (
                                                            <span className="text-muted-foreground">
                                                                {
                                                                    group.groupName
                                                                }
                                                            </span>
                                                        )}
                                                    </div>
                                                    <h2 className="mt-1.5 font-semibold leading-6 sm:text-lg">
                                                        {formatMeetingDate(
                                                            group,
                                                        )}
                                                    </h2>
                                                    <p className="mt-1 text-xs text-muted-foreground sm:hidden">
                                                        {t(
                                                            "meeting.assignmentCount",
                                                            {
                                                                count: group
                                                                    .assignments
                                                                    .length,
                                                            },
                                                        )}
                                                    </p>
                                                </div>
                                                <div className="hidden min-w-32 sm:block">
                                                    <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                                                        <span>
                                                            {t(
                                                                "meeting.assignmentCount",
                                                                {
                                                                    count: group
                                                                        .assignments
                                                                        .length,
                                                                },
                                                            )}
                                                        </span>
                                                        <strong className="text-primary tabular-nums">
                                                            {percentage}%
                                                        </strong>
                                                    </div>
                                                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background/80">
                                                        <div
                                                            className="h-full rounded-full bg-primary"
                                                            style={{
                                                                width: `${percentage}%`,
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                                <ChevronDown className="absolute end-4 top-7 size-4 text-muted-foreground transition-transform group-open/meeting:rotate-180 sm:static" />
                                            </summary>
                                            {(isActive || isOverdue) && (
                                                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/50 bg-muted/20 px-4 py-3 sm:px-5">
                                                    <p className="text-sm leading-6 text-muted-foreground">
                                                        {t(
                                                            isActive
                                                                ? ready <
                                                                  group
                                                                      .assignments
                                                                      .length
                                                                    ? "meeting.activeUnsubmitted"
                                                                    : "meeting.activeSubmitted"
                                                                : ready ===
                                                                    group
                                                                        .assignments
                                                                        .length
                                                                  ? "meeting.closedSubmitted"
                                                                  : "meeting.closedUnsubmitted",
                                                        )}
                                                    </p>
                                                    {isActive &&
                                                        group.groupId && (
                                                            <Button
                                                                asChild
                                                                variant="outline"
                                                                size="sm"
                                                            >
                                                                <Link
                                                                    href={`/groups/${group.groupId}`}
                                                                >
                                                                    {t(
                                                                        "meeting.openMeeting",
                                                                    )}
                                                                </Link>
                                                            </Button>
                                                        )}
                                                </div>
                                            )}
                                            <div className="grid gap-3 border-border/50 border-t p-3 sm:grid-cols-2 sm:p-5">
                                                {group.assignments.map(
                                                    assignmentCard,
                                                )}
                                            </div>
                                        </details>
                                    );
                                })}
                            </section>
                        ) : (
                            <section className="mt-8 grid gap-6 py-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:py-8">
                                <div className="flex items-start gap-4">
                                    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                        <CalendarCheck2 className="size-5" />
                                    </span>
                                    <div>
                                        <h2 className="text-xl font-semibold">
                                            {t("empty.title")}
                                        </h2>
                                        <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
                                            {t("empty.description")}
                                        </p>
                                    </div>
                                </div>
                                <div className="grid gap-2 sm:flex">
                                    <Button
                                        asChild
                                        className="w-full rounded-xl sm:w-auto"
                                    >
                                        <Link href="/practice">
                                            {t("empty.practice")}
                                        </Link>
                                    </Button>
                                    <Button
                                        asChild
                                        variant="ghost"
                                        className="w-full rounded-xl sm:w-auto"
                                    >
                                        <Link href="/groups">
                                            {t("empty.groups")}
                                        </Link>
                                    </Button>
                                </div>
                            </section>
                        ))}

                    {isManageView &&
                        selectedAdminGroup &&
                        selectedGroupDetails && (
                            <section className="mt-8 sm:mt-10">
                                <div className="flex gap-2 overflow-x-auto pb-2">
                                    {adminGroups.map((group) => (
                                        <Button
                                            key={group.id}
                                            asChild
                                            variant={
                                                group.id ===
                                                selectedAdminGroup.id
                                                    ? "default"
                                                    : "outline"
                                            }
                                            size="sm"
                                            className="shrink-0 rounded-xl"
                                        >
                                            <Link
                                                href={`/assignments?view=manage&group=${group.id}`}
                                            >
                                                {group.name}
                                            </Link>
                                        </Button>
                                    ))}
                                </div>

                                <div className="mt-4 overflow-hidden rounded-2xl border border-border/70 bg-card/80 shadow-sm">
                                    <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                                        <div>
                                            <p className="text-xs font-semibold text-primary">
                                                {t("admin.selectedGroup")}
                                            </p>
                                            <h2 className="mt-2 break-words text-xl font-semibold">
                                                {selectedAdminGroup.name}
                                            </h2>
                                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                                {t("admin.groupSummary", {
                                                    members:
                                                        selectedAdminGroup.memberCount,
                                                    planned: plannedMemberCount,
                                                    review: reviewQueue.length,
                                                })}
                                            </p>
                                        </div>
                                        <div className="grid gap-2 sm:flex">
                                            <Button
                                                asChild
                                                className="rounded-xl"
                                            >
                                                <Link
                                                    href={`/groups/${selectedAdminGroup.id}/plan`}
                                                >
                                                    <CalendarCheck2 className="size-4" />
                                                    {t("admin.planMeeting")}
                                                </Link>
                                            </Button>
                                            <Button
                                                asChild
                                                variant="outline"
                                                className="rounded-xl"
                                            >
                                                <Link
                                                    href={`/groups/${selectedAdminGroup.id}`}
                                                >
                                                    {t("admin.openGroup")}
                                                </Link>
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 border-border/50 border-t">
                                        <div className="p-3 text-center sm:p-4">
                                            <strong className="text-2xl text-primary tabular-nums">
                                                {activeAdminAssignments.length}
                                            </strong>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                {t("admin.active")}
                                            </p>
                                        </div>
                                        <div className="border-border/50 border-x p-3 text-center sm:p-4">
                                            <strong className="text-2xl text-primary tabular-nums">
                                                {plannedMemberCount}
                                            </strong>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                {t("admin.learners")}
                                            </p>
                                        </div>
                                        <div className="p-3 text-center sm:p-4">
                                            <strong className="text-2xl text-primary tabular-nums">
                                                {reviewQueue.length}
                                            </strong>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                {t("admin.awaitingReview")}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {reviewQueue.length > 0 && (
                                    <div className="mt-8">
                                        <div className="flex flex-wrap items-center gap-3">
                                            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                                <ClipboardCheck className="size-5" />
                                            </span>
                                            <div>
                                                <h2 className="font-semibold sm:text-lg">
                                                    {t("admin.reviewTitle")}
                                                </h2>
                                                <p className="text-sm text-muted-foreground">
                                                    {t(
                                                        "admin.reviewDescription",
                                                    )}
                                                </p>
                                            </div>
                                            <Button
                                                asChild
                                                className="w-full sm:ms-auto sm:w-auto"
                                            >
                                                <Link
                                                    href={`/groups/${selectedAdminGroup.id}#meeting-overview`}
                                                >
                                                    <ClipboardCheck className="size-4" />
                                                    {groupsT(
                                                        "flow.viewMeeting",
                                                    )}
                                                </Link>
                                            </Button>
                                        </div>
                                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                            {reviewQueue.map((assignment) => (
                                                <article
                                                    key={assignment.id}
                                                    className="min-w-0 rounded-2xl border border-primary/20 bg-card p-4 shadow-sm sm:p-5"
                                                >
                                                    <p className="break-words font-semibold">
                                                        {
                                                            assignment.assigneeName
                                                        }
                                                    </p>
                                                    <p className="mt-2 text-sm leading-6">
                                                        {t("admin.range", {
                                                            startSurah:
                                                                adminSurahName(
                                                                    assignment.startSurahNumber,
                                                                ) ??
                                                                assignment.startSurahNumber,
                                                            startAyah:
                                                                assignment.startAyahNumber,
                                                            endSurah:
                                                                adminSurahName(
                                                                    assignment.endSurahNumber,
                                                                ) ??
                                                                assignment.endSurahNumber,
                                                            endAyah:
                                                                assignment.endAyahNumber,
                                                        })}
                                                    </p>
                                                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                                        {groupsT(
                                                            "assignments.due",
                                                            {
                                                                date: formatAdminDueAt(
                                                                    assignment.dueAt,
                                                                ),
                                                            },
                                                        )}
                                                    </p>
                                                    <Button
                                                        asChild
                                                        size="sm"
                                                        className="mt-4 w-full rounded-xl sm:w-auto"
                                                    >
                                                        <Link
                                                            href={`/groups/${selectedAdminGroup.id}/review/${assignment.id}`}
                                                        >
                                                            <ClipboardCheck className="size-4" />
                                                            {groupsT(
                                                                "review.details",
                                                            )}
                                                        </Link>
                                                    </Button>
                                                </article>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="mt-8">
                                    <div className="flex items-end justify-between gap-4">
                                        <div>
                                            <h2 className="text-xl font-semibold">
                                                {t("admin.currentTitle")}
                                            </h2>
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                {t("admin.currentDescription")}
                                            </p>
                                        </div>
                                    </div>
                                    {currentAdminAssignments.length > 0 ? (
                                        <div className="mt-4 divide-y divide-border/50 overflow-hidden rounded-2xl bg-muted/25 ring-1 ring-border/50">
                                            {currentAdminAssignments.map(
                                                (assignment) => (
                                                    <article
                                                        key={assignment.id}
                                                        className="grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-5"
                                                    >
                                                        <div className="min-w-0">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <h3 className="truncate font-semibold">
                                                                    {
                                                                        assignment.assigneeName
                                                                    }
                                                                </h3>
                                                                <span
                                                                    className={cn(
                                                                        "rounded-md px-2.5 py-1 text-[0.7rem] font-medium ring-1",
                                                                        assignment.status ===
                                                                            "needs_revision"
                                                                            ? "bg-amber-500/10 text-amber-800 ring-amber-500/25 dark:text-amber-300"
                                                                            : "bg-background/70 text-muted-foreground ring-border/50",
                                                                    )}
                                                                >
                                                                    {groupsT(
                                                                        `assignments.statuses.${assignment.status}`,
                                                                    )}
                                                                </span>
                                                            </div>
                                                            <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                                                                {t(
                                                                    "admin.range",
                                                                    {
                                                                        startSurah:
                                                                            adminSurahName(
                                                                                assignment.startSurahNumber,
                                                                            ) ??
                                                                            assignment.startSurahNumber,
                                                                        startAyah:
                                                                            assignment.startAyahNumber,
                                                                        endSurah:
                                                                            adminSurahName(
                                                                                assignment.endSurahNumber,
                                                                            ) ??
                                                                            assignment.endSurahNumber,
                                                                        endAyah:
                                                                            assignment.endAyahNumber,
                                                                    },
                                                                )}
                                                            </p>
                                                            <p className="mt-1 text-xs text-muted-foreground">
                                                                {groupsT(
                                                                    "assignments.due",
                                                                    {
                                                                        date: formatAdminDueAt(
                                                                            assignment.dueAt,
                                                                        ),
                                                                    },
                                                                )}
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            {canReviewAssignment(
                                                                assignment.status,
                                                                assignment.dueAt,
                                                            ) && (
                                                                <Button
                                                                    asChild
                                                                    size="sm"
                                                                    className="rounded-xl"
                                                                >
                                                                    <Link
                                                                        href={`/groups/${selectedAdminGroup.id}/review/${assignment.id}`}
                                                                    >
                                                                        {groupsT(
                                                                            "review.details",
                                                                        )}
                                                                    </Link>
                                                                </Button>
                                                            )}
                                                            <DeleteAssignmentButton
                                                                groupId={
                                                                    selectedAdminGroup.id
                                                                }
                                                                assignmentId={
                                                                    assignment.id
                                                                }
                                                            />
                                                        </div>
                                                    </article>
                                                ),
                                            )}
                                        </div>
                                    ) : (
                                        <div className="mt-4 rounded-2xl bg-muted/25 p-6 text-center text-sm text-muted-foreground ring-1 ring-border/50">
                                            {t("admin.empty")}
                                        </div>
                                    )}
                                </div>

                                {completedAdminAssignments.length > 0 && (
                                    <details className="group/history mt-6 overflow-hidden rounded-2xl bg-muted/20 ring-1 ring-border/50">
                                        <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 text-sm font-semibold outline-none hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                                            <History className="size-4 text-primary" />
                                            {t("admin.completedHistory", {
                                                count: completedAdminAssignments.length,
                                            })}
                                            <ChevronDown className="ms-auto size-4 text-muted-foreground transition-transform group-open/history:rotate-180" />
                                        </summary>
                                        <div className="divide-y divide-border/45 border-border/50 border-t">
                                            {completedAdminAssignments.map(
                                                (assignment) => (
                                                    <div
                                                        key={assignment.id}
                                                        className="grid gap-1 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                                                    >
                                                        <div className="min-w-0">
                                                            <p className="truncate font-medium">
                                                                {
                                                                    assignment.assigneeName
                                                                }
                                                            </p>
                                                            <p className="mt-1 text-xs text-muted-foreground">
                                                                {t(
                                                                    "admin.range",
                                                                    {
                                                                        startSurah:
                                                                            adminSurahName(
                                                                                assignment.startSurahNumber,
                                                                            ) ??
                                                                            assignment.startSurahNumber,
                                                                        startAyah:
                                                                            assignment.startAyahNumber,
                                                                        endSurah:
                                                                            adminSurahName(
                                                                                assignment.endSurahNumber,
                                                                            ) ??
                                                                            assignment.endSurahNumber,
                                                                        endAyah:
                                                                            assignment.endAyahNumber,
                                                                    },
                                                                )}
                                                            </p>
                                                        </div>
                                                        {assignment.reviewedAt && (
                                                            <span className="text-xs text-muted-foreground">
                                                                {groupsT(
                                                                    "assignments.completedOn",
                                                                    {
                                                                        date: formatAdminDueAt(
                                                                            assignment.reviewedAt,
                                                                        ),
                                                                    },
                                                                )}
                                                            </span>
                                                        )}
                                                    </div>
                                                ),
                                            )}
                                        </div>
                                    </details>
                                )}

                                {hafsNavigation && warshNavigation && (
                                    <details className="group/create mt-8 overflow-hidden rounded-2xl bg-primary/[0.045] ring-1 ring-primary/12">
                                        <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 outline-none hover:bg-primary/[0.04] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                                            <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                                <CirclePlus className="size-4.5" />
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <h2 className="font-semibold">
                                                    {groupsT(
                                                        "assignments.createTitle",
                                                    )}
                                                </h2>
                                                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                                    {groupsT(
                                                        "assignments.createDescription",
                                                    )}
                                                </p>
                                            </div>
                                            <ChevronDown className="size-4 text-muted-foreground transition-transform group-open/create:rotate-180" />
                                        </summary>
                                        <div className="border-primary/10 border-t p-5 sm:p-7">
                                            <MemberAssignmentForm
                                                groupId={selectedAdminGroup.id}
                                                members={
                                                    selectedGroupDetails.members
                                                }
                                                surahs={assignmentSurahs}
                                                navigationByRiwayah={{
                                                    hafs: hafsNavigation,
                                                    warsh: warshNavigation,
                                                }}
                                                meetingOptions={meetingOptions}
                                                locale={preferences.language}
                                            />
                                        </div>
                                    </details>
                                )}
                            </section>
                        )}
                </section>
            </div>
        </main>
    );
}
