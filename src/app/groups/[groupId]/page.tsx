import {
    ArrowLeft,
    CalendarRange,
    ChevronDown,
    CirclePlus,
    ClipboardList,
    History,
    MessageCircleWarning,
    Shield,
    UserRound,
    UsersRound,
} from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createTranslator } from "next-intl";
import AnchoredDetails from "@/components/anchored-details";
import PageBackground from "@/components/page-background";
import PageHeading from "@/components/page-heading";
import SectionNav from "@/components/section-nav";
import StickyAppHeader from "@/components/sticky-app-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { auth } from "@/features/auth/auth";
import AbsenceExcuse from "@/features/groups/components/absence-excuse";
import CircleNextStep from "@/features/groups/components/circle-next-step";
import {
    GroupDangerActions,
    MemberActions,
} from "@/features/groups/components/group-actions";
import GroupActivityFeed from "@/features/groups/components/group-activity-feed";
import GroupInvite from "@/features/groups/components/group-invite";
import GroupMeetingPanel from "@/features/groups/components/group-meeting-panel";
import MeetingAgenda from "@/features/groups/components/meeting-agenda";
import MeetingHistory from "@/features/groups/components/meeting-history";
import MeetingScheduleSettings from "@/features/groups/components/meeting-schedule-settings";
import ReviewFeedbackCard from "@/features/groups/components/review-feedback-card";
import { circleNextStep } from "@/features/groups/next-step";
import { isJaasConfigured } from "@/features/groups/server/create-jaas-token";
import getGroupActivity from "@/features/groups/server/get-group-activity";
import getGroupAssignments from "@/features/groups/server/get-group-assignments";
import { getGroupMeetingForUser } from "@/features/groups/server/get-group-meeting";
import { getGroupForUser } from "@/features/groups/server/get-groups";
import getMeetingAgenda from "@/features/groups/server/get-meeting-agenda";
import getMeetingHistory from "@/features/groups/server/get-meeting-history";
import getPendingAbsence from "@/features/groups/server/get-pending-absence";
import { calculateMeetingState } from "@/features/groups/server/meeting-schedule";
import getSurahsMeta from "@/features/quran/server/get-surahs-meta";
import getPreferences from "@/features/settings/server/get-preferences";
import { getMessages, getTextDirection } from "@/i18n/config";
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

export default async function GroupPage({
    params,
}: {
    params: Promise<{ groupId: string }>;
}) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) redirect("/sign-in");

    const { groupId } = await params;
    const [preferences, group] = await Promise.all([
        getPreferences(),
        getGroupForUser(groupId, session.user.id),
    ]);
    if (!group) notFound();
    const currentUserId = session.user.id;

    const messages = await getMessages(preferences.language);
    const t = createTranslator({
        locale: preferences.language,
        messages,
        namespace: "Groups",
    });
    const isArabic = preferences.language === "ar";
    const isAdmin = group.role === "supervisor";
    const canLeave = !isAdmin;
    const canReviewOthers = isAdmin || group.isReviewer;
    const needsReviewer =
        isAdmin &&
        !group.members.some(
            (member) => member.userId !== currentUserId && member.isReviewer,
        );
    const [assignments, meeting, meetingHistory, activity, surahs] =
        await Promise.all([
            getGroupAssignments(group.id, session.user.id, canReviewOthers),
            getGroupMeetingForUser(group.id, session.user.id),
            getMeetingHistory(group.id, session.user.id, isAdmin, { limit: 2 }),
            getGroupActivity(group.id, session.user.id, isAdmin),
            getSurahsMeta(),
        ]);
    // History finalizes ended meetings first, including when cron is unavailable.
    const pendingAbsence = await getPendingAbsence(group.id, currentUserId);
    const pendingAbsenceReviews = isAdmin
        ? await getMeetingHistory(group.id, currentUserId, true, {
              limit: 1,
              pendingOnly: true,
          })
        : [];
    const meetingState = meeting ? calculateMeetingState(meeting) : null;
    const agendaStartsAt = meetingState
        ? new Date(
              meetingState.status === "active"
                  ? (meetingState.activeStartsAt ?? "")
                  : (meetingState.nextStartsAt ?? ""),
          )
        : null;
    const meetingAgenda =
        meeting && agendaStartsAt && !Number.isNaN(agendaStartsAt.getTime())
            ? await getMeetingAgenda({
                  groupId: group.id,
                  requestingUserId: session.user.id,
                  occurrenceStartsAt: agendaStartsAt,
                  active: meetingState?.status === "active",
              })
            : null;
    const surahNames = Object.fromEntries(
        surahs.map((surah) => [
            surah.number,
            isArabic ? surah.name : surah.englishName,
        ]),
    );
    const latestFeedback = assignments
        .filter((item) => item.reviewedAt && item.assigneeId === currentUserId)
        .sort(
            (a, b) =>
                (b.reviewedAt?.getTime() ?? 0) - (a.reviewedAt?.getTime() ?? 0),
        )[0];

    const providerConfigured = isJaasConfigured();
    const nextStep = circleNextStep({
        groupId: group.id,
        supervisor: isAdmin,
        live: meetingState?.status === "active" && providerConfigured,
        scheduled: Boolean(meeting?.enabled && meeting.schedule.length),
        memberCount: group.memberCount,
        assignments: isAdmin
            ? assignments
            : assignments.filter((item) => item.assigneeId === currentUserId),
        nextStartsAt: meetingState?.nextStartsAt,
        pendingAbsence: Boolean(pendingAbsence),
        pendingAbsenceReviews: pendingAbsenceReviews.length > 0,
    });

    return (
        <main
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
                    <Link
                        href="/groups"
                        className="mb-4 inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-medium text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        <ArrowLeft
                            aria-hidden="true"
                            className="size-4 rtl:rotate-180"
                        />
                        {t("detail.back")}
                    </Link>
                    <PageHeading
                        title={group.name}
                        description={group.description ?? undefined}
                        icon={<UsersRound />}
                        actions={
                            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
                                {isAdmin && (
                                    <Shield
                                        aria-hidden="true"
                                        className="size-3.5"
                                    />
                                )}
                                {t(
                                    isAdmin
                                        ? "role.supervisor"
                                        : group.isReviewer
                                          ? group.reviewerScope === "supervisor"
                                              ? "role.supervisorReviewer"
                                              : "role.reviewer"
                                          : "role.member",
                                )}
                            </span>
                        }
                    >
                        <SectionNav
                            label={t("detail.navigation")}
                            className={cn(
                                "mt-5",
                                meeting &&
                                    "grid grid-cols-2 sm:flex [&>a]:justify-center sm:[&>a]:justify-start",
                            )}
                            items={[
                                {
                                    id: "meeting-overview",
                                    label: t("detail.meetingLink"),
                                },
                                {
                                    id: "circle-assignments",
                                    label: t("detail.assignmentsLink"),
                                },
                                {
                                    id: "members",
                                    label: t("detail.memberHeading"),
                                },
                                ...(meeting
                                    ? [
                                          {
                                              id: "meeting-history",
                                              label: t("meeting.history.title"),
                                          },
                                      ]
                                    : []),
                            ]}
                        />
                    </PageHeading>

                    {nextStep.label !== "join" && (
                        <CircleNextStep step={nextStep} />
                    )}
                    <div className="mt-6 grid items-start gap-6 sm:mt-8 xl:grid-cols-[minmax(0,1fr)_20rem] xl:gap-8">
                        <div className="min-w-0 space-y-6 [&>section]:mt-0">
                            {pendingAbsence && (
                                <section
                                    id="absence-excuse"
                                    className="scroll-mt-24 overflow-hidden rounded-2xl border border-primary/20 bg-card shadow-sm"
                                >
                                    <div className="flex items-start gap-3 p-4 sm:p-5">
                                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                            <MessageCircleWarning
                                                aria-hidden="true"
                                                className="size-5"
                                            />
                                        </span>
                                        <h2 className="text-sm font-semibold leading-7">
                                            {t("flow.provideExcuse")} ·{" "}
                                            {new Intl.DateTimeFormat(
                                                preferences.language,
                                                {
                                                    dateStyle: "medium",
                                                    timeZone:
                                                        meeting?.timezone ??
                                                        "Africa/Casablanca",
                                                },
                                            ).format(pendingAbsence.startsAt)}
                                        </h2>
                                    </div>
                                    <div className="border-t border-border/50 bg-muted/20 p-4 sm:p-5">
                                        <AbsenceExcuse
                                            key={pendingAbsence.id}
                                            groupId={group.id}
                                            attendanceId={pendingAbsence.id}
                                            excuse={null}
                                            pending
                                        />
                                    </div>
                                </section>
                            )}
                            <GroupMeetingPanel
                                groupId={group.id}
                                meeting={meeting}
                                state={meetingState}
                                isAdmin={isAdmin}
                                isHost={meeting?.hostUserId === session.user.id}
                                locale={preferences.language}
                                providerConfigured={providerConfigured}
                                showPlanAction={nextStep.label !== "plan"}
                                supervisors={group.members
                                    .filter(
                                        (member) =>
                                            member.role === "supervisor",
                                    )
                                    .map((member) => ({
                                        id: member.userId,
                                        name: member.name,
                                    }))}
                            >
                                {meeting && meetingAgenda && (
                                    <MeetingAgenda
                                        groupId={group.id}
                                        agenda={meetingAgenda}
                                        currentUserId={session.user.id}
                                        canReviewOthers={canReviewOthers}
                                        locale={preferences.language}
                                        timezone={meeting.timezone}
                                        embedded
                                        surahNames={surahNames}
                                    />
                                )}
                            </GroupMeetingPanel>
                            <section
                                id="circle-assignments"
                                className="scroll-mt-24 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm"
                            >
                                <div className="flex items-start gap-3 p-4 sm:gap-4 sm:p-5">
                                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                        <ClipboardList
                                            aria-hidden="true"
                                            className="size-5"
                                        />
                                    </span>
                                    <div className="min-w-0">
                                        <h2 className="font-semibold">
                                            {t(
                                                isAdmin
                                                    ? "assignments.hubTitle"
                                                    : "assignments.memberHubTitle",
                                            )}
                                        </h2>
                                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                            {t(
                                                isAdmin
                                                    ? "assignments.hubDescriptionAdmin"
                                                    : "assignments.hubDescriptionMember",
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <div className="grid gap-3 border-t border-border/50 bg-muted/20 p-4 sm:flex sm:flex-wrap sm:p-5">
                                    <Button
                                        asChild
                                        variant="outline"
                                        className="min-h-11 rounded-xl"
                                    >
                                        <Link
                                            href={`/assignments?group=${group.id}`}
                                        >
                                            <CalendarRange
                                                aria-hidden="true"
                                                className="size-4"
                                            />
                                            {t("assignments.openMyAssignments")}
                                        </Link>
                                    </Button>
                                    {isAdmin && (
                                        <Button
                                            asChild
                                            variant="outline"
                                            className="min-h-11 rounded-xl"
                                        >
                                            <Link
                                                href={`/assignments?view=manage&group=${group.id}`}
                                            >
                                                <UsersRound
                                                    aria-hidden="true"
                                                    className="size-4"
                                                />
                                                {t(
                                                    "assignments.manageCircleAssignments",
                                                )}
                                            </Link>
                                        </Button>
                                    )}
                                </div>
                            </section>

                            {latestFeedback && (
                                <ReviewFeedbackCard
                                    feedback={{
                                        status: latestFeedback.status,
                                        reviewMethod:
                                            latestFeedback.reviewMethod,
                                        reviewerName:
                                            latestFeedback.reviewerName,
                                        reviewNote: latestFeedback.reviewNote,
                                        reviewedAt: latestFeedback.reviewedAt,
                                    }}
                                    timezone={meeting?.timezone ?? "UTC"}
                                    passage={
                                        latestFeedback.startSurahNumber ===
                                        latestFeedback.endSurahNumber
                                            ? t(
                                                  "meeting.agenda.sameSurahRange",
                                                  {
                                                      surah: surahNames[
                                                          latestFeedback
                                                              .startSurahNumber
                                                      ],
                                                      start: latestFeedback.startAyahNumber,
                                                      end: latestFeedback.endAyahNumber,
                                                  },
                                              )
                                            : t(
                                                  "meeting.agenda.crossSurahRange",
                                                  {
                                                      startSurah:
                                                          surahNames[
                                                              latestFeedback
                                                                  .startSurahNumber
                                                          ],
                                                      start: latestFeedback.startAyahNumber,
                                                      endSurah:
                                                          surahNames[
                                                              latestFeedback
                                                                  .endSurahNumber
                                                          ],
                                                      end: latestFeedback.endAyahNumber,
                                                  },
                                              )
                                    }
                                />
                            )}
                            {isAdmin && (
                                <MeetingScheduleSettings
                                    groupId={group.id}
                                    meeting={meeting}
                                    state={meetingState}
                                    locale={preferences.language}
                                />
                            )}
                            {meeting && (
                                <AnchoredDetails
                                    id="meeting-history"
                                    className="group/history scroll-mt-24 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm"
                                >
                                    <summary className="flex cursor-pointer list-none items-start gap-3 p-4 outline-none transition-colors hover:bg-muted/25 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:gap-4 sm:p-5 [&::-webkit-details-marker]:hidden">
                                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                            <History
                                                aria-hidden="true"
                                                className="size-5"
                                            />
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <h2 className="font-semibold leading-6">
                                                {t("meeting.history.title")}
                                            </h2>
                                            <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                                {t("meeting.history.overview")}
                                            </p>
                                        </div>
                                        <ChevronDown
                                            aria-hidden="true"
                                            className="mt-3 size-4 shrink-0 text-muted-foreground transition-transform group-open/history:rotate-180"
                                        />
                                    </summary>
                                    <div className="border-t border-border/50 bg-muted/20 px-4 pb-4 sm:px-5 [&>section]:mt-0">
                                        <MeetingHistory
                                            groupId={group.id}
                                            history={meetingHistory}
                                            locale={preferences.language}
                                            timezone={meeting.timezone}
                                            isAdmin={isAdmin}
                                            viewAllHref={`/groups/${group.id}/history`}
                                            showHeading={false}
                                        />
                                    </div>
                                </AnchoredDetails>
                            )}
                        </div>
                        <div className="min-w-0 space-y-4 [&>section]:mt-0 [&>section]:border-t-0 [&>section]:pt-0">
                            <section>
                                <AnchoredDetails
                                    id="members"
                                    defaultOpen={needsReviewer}
                                    className="group/members scroll-mt-24 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm"
                                >
                                    <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-4 outline-none transition-colors hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-5 [&::-webkit-details-marker]:hidden">
                                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                            <UsersRound
                                                aria-hidden="true"
                                                className="size-5"
                                            />
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <h2 className="font-semibold">
                                                {t("detail.memberHeading")}
                                            </h2>
                                            <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                                {t("members", {
                                                    count: group.memberCount,
                                                })}
                                            </p>
                                        </div>
                                        <ChevronDown
                                            aria-hidden="true"
                                            className="size-4 shrink-0 text-muted-foreground transition-transform group-open/members:rotate-180"
                                        />
                                    </summary>
                                    {isAdmin && (
                                        <div className="space-y-3 border-t border-border/50 bg-muted/20 px-4 py-3 text-xs leading-6 text-muted-foreground">
                                            {needsReviewer && (
                                                <p className="rounded-lg bg-primary/5 p-3 text-foreground">
                                                    {t(
                                                        "detail.assignYourReviewer",
                                                    )}
                                                </p>
                                            )}
                                            <details className="group/roles">
                                                <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between gap-2 rounded-md font-medium outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                                                    {t(
                                                        "detail.aboutReviewRoles",
                                                    )}
                                                    <ChevronDown
                                                        aria-hidden="true"
                                                        className="size-3.5 shrink-0 transition-transform group-open/roles:rotate-180"
                                                    />
                                                </summary>
                                                <p className="mt-2">
                                                    {t(
                                                        "detail.reviewerDescription",
                                                    )}
                                                </p>
                                            </details>
                                        </div>
                                    )}
                                    <div className="divide-y divide-border/50 border-t border-border/50 bg-muted/20">
                                        {group.members.map((member) => {
                                            const isCurrentUser =
                                                member.userId ===
                                                session.user.id;
                                            return (
                                                <article
                                                    key={member.id}
                                                    className="flex items-center gap-3 px-4 py-3"
                                                >
                                                    <Avatar className="size-9 shrink-0 border border-primary/15">
                                                        {member.image && (
                                                            <AvatarImage
                                                                src={
                                                                    member.image
                                                                }
                                                                alt=""
                                                            />
                                                        )}
                                                        <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                                                            {initials(
                                                                member.name,
                                                            ) || (
                                                                <UserRound className="size-4" />
                                                            )}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-baseline gap-2">
                                                            <h3 className="break-words text-sm font-semibold leading-6">
                                                                <bdi>
                                                                    {
                                                                        member.name
                                                                    }
                                                                </bdi>
                                                            </h3>
                                                            {isCurrentUser && (
                                                                <span className="shrink-0 text-[0.65rem] text-muted-foreground">
                                                                    {t(
                                                                        "detail.you",
                                                                    )}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {member.role ===
                                                            "supervisor" && (
                                                            <p className="mt-0.5 text-xs text-muted-foreground">
                                                                {t(
                                                                    "role.supervisor",
                                                                )}
                                                            </p>
                                                        )}
                                                        {member.isReviewer &&
                                                            member.role !==
                                                                "supervisor" && (
                                                                <p className="mt-0.5 text-xs text-primary">
                                                                    {t(
                                                                        member.reviewerScope ===
                                                                            "supervisor"
                                                                            ? "role.supervisorReviewer"
                                                                            : "role.reviewer",
                                                                    )}
                                                                </p>
                                                            )}
                                                    </div>
                                                    {isAdmin &&
                                                        !isCurrentUser && (
                                                            <div className="shrink-0">
                                                                <MemberActions
                                                                    memberName={
                                                                        member.name
                                                                    }
                                                                    reviewerScope={
                                                                        member.reviewerScope
                                                                    }
                                                                    isReviewer={
                                                                        member.isReviewer
                                                                    }
                                                                    groupId={
                                                                        group.id
                                                                    }
                                                                    membershipId={
                                                                        member.id
                                                                    }
                                                                    role={
                                                                        member.role
                                                                    }
                                                                />
                                                            </div>
                                                        )}
                                                </article>
                                            );
                                        })}
                                    </div>
                                </AnchoredDetails>

                                {isAdmin && (
                                    <AnchoredDetails
                                        id="invite-members"
                                        className="group/invite mt-4 scroll-mt-24 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm"
                                        defaultOpen={group.memberCount < 2}
                                    >
                                        <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-4 outline-none transition-colors hover:bg-primary/[0.055] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-5 [&::-webkit-details-marker]:hidden">
                                            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                                <CirclePlus
                                                    aria-hidden="true"
                                                    className="size-5"
                                                />
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <h2 className="font-semibold">
                                                    {t("detail.inviteHeading")}
                                                </h2>
                                                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                                    {t(
                                                        "detail.inviteDescription",
                                                    )}
                                                </p>
                                            </div>
                                            <ChevronDown
                                                aria-hidden="true"
                                                className="size-4 shrink-0 text-muted-foreground transition-transform group-open/invite:rotate-180"
                                            />
                                        </summary>
                                        <div className="border-t border-border/50 bg-muted/20 px-4 pb-5 sm:px-5">
                                            <GroupInvite
                                                inviteCode={group.inviteCode}
                                            />
                                        </div>
                                    </AnchoredDetails>
                                )}
                            </section>

                            <GroupActivityFeed
                                activity={activity}
                                currentUserId={session.user.id}
                                groupId={group.id}
                                isAdmin={isAdmin}
                                locale={preferences.language}
                                timezone={meeting?.timezone ?? "UTC"}
                            />

                            <GroupDangerActions
                                groupId={group.id}
                                isAdmin={isAdmin}
                                canLeave={
                                    canLeave &&
                                    meeting?.hostUserId !== currentUserId
                                }
                            />
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
}
