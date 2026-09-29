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
    const activeAssignmentCount = assignments.filter(
        (assignment) => assignment.status !== "completed",
    ).length;
    const awaitingReviewCount = assignments.filter(
        (assignment) => assignment.status === "submitted",
    ).length;
    const assignedMemberCount = new Set(
        assignments
            .filter((assignment) => assignment.status !== "completed")
            .map((assignment) => assignment.assigneeId),
    ).size;

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
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
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

                    <div className="mt-6 grid items-start gap-6 sm:mt-8 xl:grid-cols-[minmax(0,1fr)_20rem] xl:gap-8">
                        <div className="min-w-0 space-y-6 [&>section]:mt-0">
                            <GroupMeetingPanel
                                groupId={group.id}
                                meeting={meeting}
                                state={meetingState}
                                isAdmin={isAdmin}
                                isHost={meeting?.hostUserId === session.user.id}
                                locale={preferences.language}
                                providerConfigured={isJaasConfigured()}
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
                            <section className="overflow-hidden rounded-2xl border border-border/70 bg-card/80 shadow-sm">
                                <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                                    <div>
                                        <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">
                                            {t("assignments.eyebrow")}
                                        </p>
                                        <h2 className="mt-2 text-xl font-semibold tracking-tight">
                                            {t("assignments.hubTitle")}
                                        </h2>
                                        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                                            {t(
                                                isAdmin
                                                    ? "assignments.hubDescriptionAdmin"
                                                    : "assignments.hubDescriptionMember",
                                            )}
                                        </p>
                                    </div>
                                    <Button
                                        asChild
                                        className="w-full rounded-xl lg:w-auto"
                                    >
                                        <Link
                                            href={
                                                isAdmin
                                                    ? `/assignments?view=manage&group=${group.id}`
                                                    : `/assignments?group=${group.id}`
                                            }
                                        >
                                            <CalendarRange className="size-4" />
                                            {t("assignments.openHub")}
                                        </Link>
                                    </Button>
                                </div>
                                <div className="grid grid-cols-3 border-border/50 border-t">
                                    <div className="p-3 text-center sm:p-4">
                                        <strong className="text-2xl text-primary tabular-nums">
                                            {activeAssignmentCount}
                                        </strong>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {t("assignments.hubActive")}
                                        </p>
                                    </div>
                                    <div className="border-border/50 border-x p-3 text-center sm:p-4">
                                        <strong className="text-2xl text-primary tabular-nums">
                                            {assignedMemberCount}
                                        </strong>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {t("assignments.hubMembers")}
                                        </p>
                                    </div>
                                    <div className="p-3 text-center sm:p-4">
                                        <strong className="text-2xl text-primary tabular-nums">
                                            {awaitingReviewCount}
                                        </strong>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {t("assignments.hubReview")}
                                        </p>
                                    </div>
                                </div>
                            </section>

                            {meeting && (
                                <MeetingHistory
                                    groupId={group.id}
                                    history={meetingHistory}
                                    locale={preferences.language}
                                    timezone={meeting.timezone}
                                    isAdmin={isAdmin}
                                    viewAllHref={`/groups/${group.id}/history`}
                                />
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
                                    <details className="group/invite mt-3 overflow-hidden rounded-2xl border border-primary/15 bg-primary/[0.045] shadow-sm">
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
