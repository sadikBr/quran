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
import UserMenu from "@/components/user-menu";
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
import getReadingProgress from "@/features/reading-progress/server/get-reading-progress";
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
    const [preferences, readingProgress, group] = await Promise.all([
        getPreferences(),
        getReadingProgress(),
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
    const homeT = createTranslator({
        locale: preferences.language,
        messages,
        namespace: "Home",
    });
    const isArabic = preferences.language === "ar";
    const isAdmin = group.role === "admin";
    const canLeave =
        !isAdmin ||
        group.members.filter((member) => member.role === "admin").length > 1;
    const readingNumber =
        preferences.readingMode === "page"
            ? (readingProgress.lastPageNumber ?? 1)
            : (readingProgress.lastSurahNumber ?? 1);
    const continueReadingHref = `/quran/${preferences.readingMode}/${readingNumber}`;
    const accountLabels = {
        openMenu: homeT("account.openMenu"),
        readingSpace: homeT("account.readingSpace"),
        switchToLight: homeT("account.switchToLight"),
        switchToDark: homeT("account.switchToDark"),
        continueReading: homeT("account.continueReading"),
        dashboard: homeT("account.dashboard"),
        profile: homeT("account.profile"),
        settings: homeT("account.settings"),
        signOut: homeT("account.signOut"),
    };
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
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
                <StickyAppHeader
                    navigation
                    className="-mx-4 px-4 sm:-mx-6 sm:px-6"
                >
                    <Link href="/groups" className="flex items-center gap-3">
                        <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                            <UsersRound className="size-5" />
                        </span>
                        <span className="max-w-52 truncate text-sm font-semibold">
                            {group.name}
                        </span>
                    </Link>
                    <UserMenu
                        name={session.user.name}
                        image={session.user.image}
                        continueReadingHref={continueReadingHref}
                        labels={accountLabels}
                    />
                </StickyAppHeader>

                <section className="py-8 sm:py-14">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                        <div className="max-w-2xl">
                            <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.14em] text-primary uppercase">
                                {isAdmin && <Shield className="size-4" />}
                                {t(
                                    group.role === "admin"
                                        ? "role.admin"
                                        : "role.member",
                                )}
                            </div>
                            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                                {group.name}
                            </h1>
                            {group.description && (
                                <p className="mt-4 leading-7 text-muted-foreground">
                                    {group.description}
                                </p>
                            )}
                        </div>
                        <div className="inline-flex w-fit items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
                            <UsersRound className="size-4" />
                            {t("members", { count: group.memberCount })}
                        </div>
                    </div>

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
                    <section className="mt-10 overflow-hidden rounded-3xl bg-muted/30 ring-1 ring-border/55 sm:mt-12">
                        <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                            <div>
                                <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">
                                    {t("assignments.eyebrow")}
                                </p>
                                <h2 className="mt-2 text-2xl font-semibold tracking-tight">
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
                            <div className="p-4 text-center sm:p-5">
                                <strong className="text-2xl text-primary tabular-nums">
                                    {activeAssignmentCount}
                                </strong>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {t("assignments.hubActive")}
                                </p>
                            </div>
                            <div className="border-border/50 border-x p-4 text-center sm:p-5">
                                <strong className="text-2xl text-primary tabular-nums">
                                    {assignedMemberCount}
                                </strong>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {t("assignments.hubMembers")}
                                </p>
                            </div>
                            <div className="p-4 text-center sm:p-5">
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
                                        member.userId === session.user.id;
                                    return (
                                        <article
                                            key={member.id}
                                            className="flex items-center gap-3 px-4 py-4 sm:px-5"
                                        >
                                            <Avatar className="size-11 border border-primary/15">
                                                {member.image && (
                                                    <AvatarImage
                                                        src={member.image}
                                                        alt=""
                                                    />
                                                )}
                                                <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                                                    {initials(member.name) || (
                                                        <UserRound className="size-4" />
                                                    )}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h3 className="truncate font-semibold">
                                                        {member.name}
                                                    </h3>
                                                    {isCurrentUser && (
                                                        <span className="text-xs text-primary">
                                                            {t("detail.you")}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="truncate text-sm text-muted-foreground">
                                                    {member.email}
                                                </p>
                                            </div>
                                            <span className="hidden rounded-full bg-background/70 px-3 py-1 text-xs text-muted-foreground ring-1 ring-border/50 sm:inline-flex">
                                                {t(`role.${member.role}`)}
                                            </span>
                                            {isAdmin && !isCurrentUser && (
                                                <MemberActions
                                                    groupId={group.id}
                                                    membershipId={member.id}
                                                    role={member.role}
                                                />
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
                                            {t("detail.inviteDescription")}
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
                            canLeave && meeting?.hostUserId !== currentUserId
                        }
                    />
                </section>
            </div>
        </main>
    );
}
