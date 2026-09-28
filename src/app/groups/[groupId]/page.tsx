import {
    ArrowLeft,
    ArrowRight,
    BookMarked,
    CalendarDays,
    CalendarRange,
    ChevronDown,
    CirclePlus,
    ClipboardCheck,
    History,
    RefreshCcw,
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
import DeleteAssignmentButton from "@/features/groups/components/delete-assignment-button";
import {
    GroupDangerActions,
    MemberActions,
} from "@/features/groups/components/group-actions";
import GroupInvite from "@/features/groups/components/group-invite";
import MemberAssignmentForm from "@/features/groups/components/member-assignment-form";
import getGroupAssignments, {
    type GroupAssignmentSummary,
} from "@/features/groups/server/get-group-assignments";
import { getGroupForUser } from "@/features/groups/server/get-groups";
import getSurahsMeta from "@/features/quran/server/get-surahs-meta";
import { getWarshChapters } from "@/features/quran/server/get-warsh-mushaf";
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
    const currentGroupId = group.id;

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
    const practiceT = createTranslator({
        locale: preferences.language,
        messages,
        namespace: "Practice",
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
    const [assignments, surahs, warshChapters] = await Promise.all([
        getGroupAssignments(group.id, session.user.id, isAdmin),
        getSurahsMeta(),
        isAdmin ? getWarshChapters() : Promise.resolve([]),
    ]);
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
    const surahName = (surahNumber: number) => {
        const surah = surahs.find((item) => item.number === surahNumber);
        return preferences.language === "ar" ? surah?.name : surah?.englishName;
    };
    const dateFormatter = new Intl.DateTimeFormat(preferences.language, {
        dateStyle: "medium",
        timeZone: "UTC",
    });
    const assignmentMembers = group.members
        .filter((member) => isAdmin || member.userId === currentUserId)
        .map((member) => ({
            member,
            assignments: assignments.filter(
                (assignment) => assignment.assigneeId === member.userId,
            ),
        }))
        .sort((first, second) => {
            const priority = (memberAssignments: GroupAssignmentSummary[]) =>
                memberAssignments.some(
                    (assignment) => assignment.status === "submitted",
                )
                    ? 2
                    : memberAssignments.some(
                            (assignment) => assignment.status !== "completed",
                        )
                      ? 1
                      : 0;

            return (
                priority(second.assignments) - priority(first.assignments) ||
                first.member.name.localeCompare(
                    second.member.name,
                    preferences.language,
                )
            );
        });

    function renderAssignment(
        assignment: GroupAssignmentSummary,
        isHistory = false,
    ) {
        const Icon =
            assignment.kind === "memorization" ? BookMarked : RefreshCcw;
        const isMine = assignment.assigneeId === currentUserId;

        return (
            <article
                key={assignment.id}
                className={cn(
                    "grid gap-4 px-4 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-5",
                    isHistory && "bg-background/25",
                )}
            >
                <div className="flex min-w-0 items-start gap-3.5">
                    <span
                        className={cn(
                            "flex size-9 shrink-0 items-center justify-center rounded-xl",
                            isHistory
                                ? "bg-muted text-muted-foreground"
                                : "bg-primary/10 text-primary",
                        )}
                    >
                        <Icon aria-hidden="true" className="size-4.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-semibold text-primary">
                                {practiceT(`kinds.${assignment.kind}`)}
                            </span>
                            <span
                                className={cn(
                                    "rounded-full px-2.5 py-0.5 text-[0.7rem] ring-1",
                                    assignment.status === "submitted"
                                        ? "bg-primary/10 font-semibold text-primary ring-primary/20"
                                        : assignment.status === "needs_revision"
                                          ? "bg-destructive/8 text-destructive ring-destructive/15"
                                          : "bg-background/70 text-muted-foreground ring-border/50",
                                )}
                            >
                                {t(`assignments.statuses.${assignment.status}`)}
                            </span>
                        </div>
                        <h4 className="mt-2 font-semibold leading-7">
                            {practiceT("range", {
                                startSurah:
                                    surahName(assignment.startSurahNumber) ??
                                    assignment.startSurahNumber,
                                startAyah: assignment.startAyahNumber,
                                endSurah:
                                    surahName(assignment.endSurahNumber) ??
                                    assignment.endSurahNumber,
                                endAyah: assignment.endAyahNumber,
                            })}
                        </h4>
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                            {isHistory && assignment.reviewedAt ? (
                                <span className="inline-flex items-center gap-1.5">
                                    <CalendarDays
                                        aria-hidden="true"
                                        className="size-3.5"
                                    />
                                    {t("assignments.completedOn", {
                                        date: dateFormatter.format(
                                            assignment.reviewedAt,
                                        ),
                                    })}
                                </span>
                            ) : assignment.dueAt ? (
                                <span className="inline-flex items-center gap-1.5">
                                    <CalendarDays
                                        aria-hidden="true"
                                        className="size-3.5"
                                    />
                                    {t("assignments.due", {
                                        date: dateFormatter.format(
                                            assignment.dueAt,
                                        ),
                                    })}
                                </span>
                            ) : null}
                            <span>
                                {t("assignments.riwayah", {
                                    riwayah: t(
                                        `assignments.riwayahs.${assignment.riwayah}`,
                                    ),
                                })}
                            </span>
                        </div>
                        {assignment.instructions && (
                            <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">
                                {assignment.instructions}
                            </p>
                        )}
                        {assignment.reviewNote && (
                            <div className="mt-3 rounded-xl bg-primary/[0.055] px-3.5 py-2.5 ring-1 ring-primary/10">
                                <p className="text-xs font-semibold text-primary">
                                    {t("assignments.feedback")}
                                </p>
                                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                    {assignment.reviewNote}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 sm:max-w-52 sm:justify-end">
                    {isAdmin && assignment.status === "submitted" && (
                        <Button asChild size="sm" className="rounded-xl">
                            <Link
                                href={`/groups/${currentGroupId}/review/${assignment.id}`}
                            >
                                <ClipboardCheck className="size-4" />
                                {t("assignments.reviewNow")}
                            </Link>
                        </Button>
                    )}
                    {isMine && !isHistory && (
                        <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            className="rounded-xl text-primary hover:text-primary"
                        >
                            <Link href={`/practice/${assignment.id}/read`}>
                                {t("assignments.open")}
                                <ArrowRight
                                    className={cn(
                                        "size-4",
                                        isArabic && "rotate-180",
                                    )}
                                />
                            </Link>
                        </Button>
                    )}
                    {isAdmin && (
                        <DeleteAssignmentButton
                            groupId={currentGroupId}
                            assignmentId={assignment.id}
                        />
                    )}
                </div>
            </article>
        );
    }

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
            <div className="mx-auto max-w-5xl px-4">
                <StickyAppHeader className="-mx-4 px-4">
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

                <section className="py-10 sm:py-14">
                    <Link
                        href="/groups"
                        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
                    >
                        <ArrowLeft
                            className={cn("size-4", isArabic && "rotate-180")}
                        />
                        {t("detail.back")}
                    </Link>

                    <div className="mt-9 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                        <div className="max-w-2xl">
                            <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.14em] text-primary uppercase">
                                {isAdmin && <Shield className="size-4" />}
                                {t(`role.${group.role}`)}
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

                    {isAdmin && (
                        <section className="mt-10 rounded-3xl bg-primary/[0.07] p-6 ring-1 ring-primary/15 sm:p-7">
                            <h2 className="text-lg font-semibold">
                                {t("detail.inviteHeading")}
                            </h2>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                {t("detail.inviteDescription")}
                            </p>
                            <GroupInvite inviteCode={group.inviteCode} />
                        </section>
                    )}

                    <section className="mt-12">
                        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                                <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">
                                    {t("assignments.eyebrow")}
                                </p>
                                <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                                    {t("assignments.title")}
                                </h2>
                                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                                    {t("assignments.description")}
                                </p>
                            </div>
                            {isAdmin && (
                                <Button
                                    asChild
                                    className="w-full shrink-0 rounded-xl sm:w-auto"
                                >
                                    <Link href={`/groups/${group.id}/plan`}>
                                        <CalendarRange className="size-4" />
                                        {t("assignments.planWeek")}
                                    </Link>
                                </Button>
                            )}
                        </div>

                        {assignments.length > 0 ? (
                            <div className="mt-6 divide-y divide-border/55 overflow-hidden rounded-3xl bg-muted/30 ring-1 ring-border/50">
                                {assignmentMembers.map(
                                    ({ member, assignments: memberWork }) => {
                                        const currentAssignments =
                                            memberWork.filter(
                                                (assignment) =>
                                                    assignment.status !==
                                                    "completed",
                                            );
                                        const completedAssignments = memberWork
                                            .filter(
                                                (assignment) =>
                                                    assignment.status ===
                                                    "completed",
                                            )
                                            .sort(
                                                (first, second) =>
                                                    (second.reviewedAt?.getTime() ??
                                                        0) -
                                                    (first.reviewedAt?.getTime() ??
                                                        0),
                                            );
                                        const readyCount =
                                            currentAssignments.filter(
                                                (assignment) =>
                                                    assignment.status ===
                                                    "submitted",
                                            ).length;

                                        return (
                                            <details
                                                key={member.id}
                                                className="group/member bg-background/20 open:bg-background/40"
                                                open={
                                                    readyCount > 0 ||
                                                    (!isAdmin &&
                                                        currentAssignments.length >
                                                            0)
                                                }
                                            >
                                                <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-4 outline-none transition-colors hover:bg-muted/45 focus-visible:bg-muted/45 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-5 [&::-webkit-details-marker]:hidden">
                                                    <Avatar className="size-11 shrink-0 border border-primary/15">
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
                                                        <h3 className="truncate font-semibold">
                                                            {member.name}
                                                        </h3>
                                                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                                            <span>
                                                                {t(
                                                                    "assignments.currentCount",
                                                                    {
                                                                        count: currentAssignments.length,
                                                                    },
                                                                )}
                                                            </span>
                                                            {completedAssignments.length >
                                                                0 && (
                                                                <span>
                                                                    {t(
                                                                        "assignments.completedCount",
                                                                        {
                                                                            count: completedAssignments.length,
                                                                        },
                                                                    )}
                                                                </span>
                                                            )}
                                                            {readyCount > 0 && (
                                                                <span className="font-semibold text-primary sm:hidden">
                                                                    {t(
                                                                        "assignments.readyCount",
                                                                        {
                                                                            count: readyCount,
                                                                        },
                                                                    )}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {readyCount > 0 && (
                                                        <span className="hidden rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary sm:inline-flex">
                                                            {t(
                                                                "assignments.readyCount",
                                                                {
                                                                    count: readyCount,
                                                                },
                                                            )}
                                                        </span>
                                                    )}
                                                    <ChevronDown
                                                        aria-hidden="true"
                                                        className="size-4 shrink-0 text-muted-foreground transition-transform group-open/member:rotate-180"
                                                    />
                                                </summary>

                                                <div className="border-t border-border/50">
                                                    {currentAssignments.length >
                                                    0 ? (
                                                        <div className="divide-y divide-border/45">
                                                            {currentAssignments.map(
                                                                (assignment) =>
                                                                    renderAssignment(
                                                                        assignment,
                                                                    ),
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <p className="px-5 py-5 text-sm text-muted-foreground">
                                                            {t(
                                                                "assignments.noCurrentForMember",
                                                            )}
                                                        </p>
                                                    )}

                                                    {completedAssignments.length >
                                                        0 && (
                                                        <details className="group/history border-t border-border/45">
                                                            <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-3 text-xs font-semibold text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                                                                <History
                                                                    aria-hidden="true"
                                                                    className="size-3.5"
                                                                />
                                                                {t(
                                                                    "assignments.history",
                                                                    {
                                                                        count: completedAssignments.length,
                                                                    },
                                                                )}
                                                                <ChevronDown
                                                                    aria-hidden="true"
                                                                    className="ms-auto size-3.5 transition-transform group-open/history:rotate-180"
                                                                />
                                                            </summary>
                                                            <div className="divide-y divide-border/40 border-t border-border/40">
                                                                {completedAssignments.map(
                                                                    (
                                                                        assignment,
                                                                    ) =>
                                                                        renderAssignment(
                                                                            assignment,
                                                                            true,
                                                                        ),
                                                                )}
                                                            </div>
                                                        </details>
                                                    )}
                                                </div>
                                            </details>
                                        );
                                    },
                                )}
                            </div>
                        ) : (
                            <div className="mt-6 rounded-3xl bg-muted/35 p-7 text-center ring-1 ring-border/50">
                                <BookMarked className="mx-auto size-6 text-primary" />
                                <h3 className="mt-4 font-semibold">
                                    {t("assignments.emptyTitle")}
                                </h3>
                                <p className="mt-2 text-sm text-muted-foreground">
                                    {t(
                                        isAdmin
                                            ? "assignments.emptyDescriptionAdmin"
                                            : "assignments.emptyDescriptionMember",
                                    )}
                                </p>
                            </div>
                        )}

                        {isAdmin && (
                            <details className="group/create mt-6 overflow-hidden rounded-2xl bg-primary/[0.055] ring-1 ring-primary/12">
                                <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 outline-none hover:bg-primary/[0.04] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-6 [&::-webkit-details-marker]:hidden">
                                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                        <CirclePlus className="size-4.5" />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="font-semibold">
                                            {t("assignments.createTitle")}
                                        </h3>
                                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                            {t("assignments.createDescription")}
                                        </p>
                                    </div>
                                    <ChevronDown className="size-4 text-muted-foreground transition-transform group-open/create:rotate-180" />
                                </summary>
                                <div className="border-t border-primary/10 p-5 sm:p-7">
                                    <MemberAssignmentForm
                                        groupId={group.id}
                                        members={group.members}
                                        surahs={assignmentSurahs}
                                        locale={preferences.language}
                                    />
                                </div>
                            </details>
                        )}
                    </section>

                    <section className="mt-10">
                        <h2 className="text-xl font-semibold">
                            {t("detail.memberHeading")}
                        </h2>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                            {t("detail.memberDescription")}
                        </p>
                        <div className="mt-6 divide-y divide-border/50 overflow-hidden rounded-3xl bg-muted/35 ring-1 ring-border/50">
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
                    </section>

                    <GroupDangerActions
                        groupId={group.id}
                        isAdmin={isAdmin}
                        canLeave={canLeave}
                    />
                </section>
            </div>
        </main>
    );
}
