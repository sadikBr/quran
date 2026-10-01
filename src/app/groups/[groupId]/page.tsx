import {
    CalendarRange,
    ChevronDown,
    CirclePlus,
    Shield,
    UserRound,
    UsersRound,
} from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createTranslator } from "next-intl";
import PageBackground from "@/components/page-background";
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
    const [assignments, meeting, meetingHistory, activity, surahs] =
        await Promise.all([
            getGroupAssignments(group.id, session.user.id, isAdmin),
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
    const latestFeedback = !isAdmin
        ? assignments
              .filter((item) => item.reviewedAt)
              .sort(
                  (a, b) =>
                      (b.reviewedAt?.getTime() ?? 0) -
                      (a.reviewedAt?.getTime() ?? 0),
              )[0]
        : null;

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
                    <div className="flex flex-col gap-4 border-b border-border/60 pb-6 sm:flex-row sm:items-center sm:justify-between sm:pb-8">
                        <div className="min-w-0 max-w-3xl">
                            <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.14em] text-primary uppercase">
                                {isAdmin && <Shield className="size-4" />}
                                {t(
                                    group.role === "supervisor"
                                        ? "role.supervisor"
                                        : "role.member",
                                )}
                            </div>
                            <h1 className="mt-2 break-words text-3xl font-semibold leading-snug tracking-tight sm:text-4xl">
                                {group.name}
                            </h1>
                            {group.description && (
                                <p className="mt-3 break-words text-sm leading-7 text-muted-foreground sm:text-base">
                                    {group.description}
                                </p>
                            )}
                        </div>
                        <div className="inline-flex w-fit shrink-0 items-center gap-2 rounded-xl border border-border/60 bg-card px-3 py-2 text-sm font-medium text-muted-foreground">
                            <UsersRound className="size-4" />
                            {t("members", { count: group.memberCount })}
                        </div>
                    </div>

                    <CircleNextStep
                        groupId={group.id}
                        supervisor={isAdmin}
                        live={
                            meetingState?.status === "active" &&
                            isJaasConfigured()
                        }
                        scheduled={Boolean(
                            meeting?.enabled && meeting.schedule.length,
                        )}
                        memberCount={group.memberCount}
                        assignments={assignments}
                        nextStartsAt={meetingState?.nextStartsAt}
                        pendingAbsence={Boolean(pendingAbsence)}
                        pendingAbsenceReviews={pendingAbsenceReviews.length > 0}
                    />
                    <div className="mt-6 grid items-start gap-6 sm:mt-8 xl:grid-cols-[minmax(0,1fr)_20rem] xl:gap-8">
                        <div className="min-w-0 space-y-6 [&>section]:mt-0">
                            {pendingAbsence && (
                                <section
                                    id="absence-excuse"
                                    className="scroll-mt-24 rounded-xl border border-primary/15 bg-card p-4"
                                >
                                    <h2 className="mb-3 text-sm font-semibold text-primary">
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
                                    <AbsenceExcuse
                                        key={pendingAbsence.id}
                                        groupId={group.id}
                                        attendanceId={pendingAbsence.id}
                                        excuse={null}
                                        pending
                                    />
                                </section>
                            )}
                            {latestFeedback && (
                                <section
                                    id="your-feedback"
                                    className="scroll-mt-24 rounded-xl border border-primary/15 bg-card p-4"
                                >
                                    <h2 className="text-sm font-semibold text-primary">
                                        {t("flow.results")}
                                    </h2>
                                    <p className="mt-2 text-sm">
                                        {
                                            surahs.find(
                                                (surah) =>
                                                    surah.number ===
                                                    latestFeedback.startSurahNumber,
                                            )?.[
                                                isArabic
                                                    ? "name"
                                                    : "englishName"
                                            ]
                                        }{" "}
                                        · {latestFeedback.startAyahNumber} —{" "}
                                        {
                                            surahs.find(
                                                (surah) =>
                                                    surah.number ===
                                                    latestFeedback.endSurahNumber,
                                            )?.[
                                                isArabic
                                                    ? "name"
                                                    : "englishName"
                                            ]
                                        }{" "}
                                        · {latestFeedback.endAyahNumber}
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        {t(
                                            `assignments.statuses.${latestFeedback.status}`,
                                        )}
                                    </p>
                                    {latestFeedback.reviewNote && (
                                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                                            {latestFeedback.reviewNote}
                                        </p>
                                    )}
                                </section>
                            )}
                            <GroupMeetingPanel
                                groupId={group.id}
                                meeting={meeting}
                                state={meetingState}
                                isAdmin={isAdmin}
                                isHost={meeting?.hostUserId === session.user.id}
                                locale={preferences.language}
                                providerConfigured={isJaasConfigured()}
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
                                        isAdmin={isAdmin}
                                        locale={preferences.language}
                                        timezone={meeting.timezone}
                                        embedded
                                        surahNames={Object.fromEntries(
                                            surahs.map((surah) => [
                                                surah.number,
                                                preferences.language === "ar"
                                                    ? surah.name
                                                    : surah.englishName,
                                            ]),
                                        )}
                                    />
                                )}
                            </GroupMeetingPanel>
                            <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/40 p-4">
                                <h2 className="text-sm font-semibold">
                                    {t(
                                        isAdmin
                                            ? "assignments.hubTitle"
                                            : "assignments.memberHubTitle",
                                    )}
                                </h2>
                                <Button
                                    asChild
                                    variant="outline"
                                    className="min-h-11 w-full rounded-xl sm:w-auto"
                                >
                                    <Link
                                        href={
                                            isAdmin
                                                ? `/assignments?view=manage&group=${group.id}`
                                                : `/assignments?group=${group.id}`
                                        }
                                    >
                                        <CalendarRange
                                            aria-hidden="true"
                                            className="size-4"
                                        />
                                        {t(
                                            isAdmin
                                                ? "assignments.openHub"
                                                : "assignments.openMyAssignments",
                                        )}
                                    </Link>
                                </Button>
                            </section>

                            {meeting && (
                                <details className="group/history rounded-2xl border border-border/60 bg-card/40">
                                    <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 p-4 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                                        {t("meeting.history.title")}
                                        <ChevronDown
                                            aria-hidden="true"
                                            className="size-4 text-muted-foreground transition-transform group-open/history:rotate-180"
                                        />
                                    </summary>
                                    <div className="border-t border-border/50 px-4 pb-4 [&>section]:mt-0">
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
                                </details>
                            )}
                        </div>
                        <div className="min-w-0 space-y-4 [&>section]:mt-0 [&>section]:border-t-0 [&>section]:pt-0">
                            <GroupActivityFeed
                                activity={activity}
                                currentUserId={session.user.id}
                                groupId={group.id}
                                isAdmin={isAdmin}
                                locale={preferences.language}
                                timezone={meeting?.timezone ?? "UTC"}
                            />

                            <section className="mt-12 border-border/60 border-t pt-8 sm:mt-16 sm:pt-10">
                                <details className="group/members overflow-hidden rounded-2xl border border-border/60 bg-card/45 shadow-sm">
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
                                            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground sm:text-sm">
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
                                    <div className="divide-y divide-border/50 border-border/50 border-t">
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
                                                    </div>
                                                    {isAdmin &&
                                                        !isCurrentUser && (
                                                            <div className="shrink-0">
                                                                <MemberActions
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
                                </details>

                                {isAdmin && (
                                    <details
                                        id="invite-members"
                                        className="group/invite mt-3 scroll-mt-24 overflow-hidden rounded-2xl border border-primary/15 bg-primary/[0.045] shadow-sm"
                                        open={group.memberCount < 2}
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
                                                <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground sm:text-sm">
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
                                        <div className="border-primary/10 border-t px-4 pb-5 sm:px-5">
                                            <GroupInvite
                                                inviteCode={group.inviteCode}
                                            />
                                        </div>
                                    </details>
                                )}
                            </section>

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
