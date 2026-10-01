import {
    ArrowRight,
    BookMarked,
    BookOpen,
    CalendarCheck2,
    CalendarClock,
    Check,
    type LucideIcon,
    MoonStar,
    Sparkles,
    UsersRound,
    Video,
} from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createTranslator } from "next-intl";
import PageBackground from "@/components/page-background";
import PageHeading from "@/components/page-heading";
import StickyAppHeader from "@/components/sticky-app-header";
import { Button } from "@/components/ui/button";
import { auth } from "@/features/auth/auth";
import { getGroupsForUser } from "@/features/groups/server/get-groups";
import { getNextGroupMeetingForUser } from "@/features/groups/server/get-next-group-meeting";
import { getMeetingDisplayTimezone } from "@/features/groups/server/meeting-schedule";
import getMemorizationProgress from "@/features/memorization/server/get-memorization-progress";
import GuideDirectory from "@/features/onboarding/guide-directory";
import {
    getAssignedPracticeAssignments,
    getPracticeAssignments,
} from "@/features/practice/server/get-practice-assignment";
import getSurahsMeta from "@/features/quran/server/get-surahs-meta";
import getReadingProgress from "@/features/reading-progress/server/get-reading-progress";
import getPreferences from "@/features/settings/server/get-preferences";
import getDailyWird from "@/features/wird/server/get-daily-wird";
import { getMessages, getTextDirection } from "@/i18n/config";
import { cn } from "@/lib/utils";

function DashboardShortcut({
    href,
    icon: Icon,
    eyebrow,
    title,
    description,
    isArabic,
    emphasized = false,
}: {
    href: string;
    icon: LucideIcon;
    eyebrow: string;
    title: string;
    description: string;
    isArabic: boolean;
    emphasized?: boolean;
}) {
    return (
        <Link
            href={href}
            className="app-card group grid min-w-0 grid-cols-[2.5rem_minmax(0,1fr)] items-start gap-3 p-4 outline-none transition-colors hover:border-primary/30 hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-ring sm:p-5"
        >
            <span
                className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors",
                    emphasized
                        ? "bg-primary text-primary-foreground"
                        : "bg-primary/10 text-primary",
                )}
            >
                <Icon aria-hidden="true" className="size-5" />
            </span>
            <div className="min-w-0">
                <p className="text-[0.65rem] font-semibold tracking-[0.14em] text-primary uppercase">
                    {eyebrow}
                </p>
                <h3 className="mt-1.5 flex min-w-0 items-center gap-2 text-base font-semibold tracking-tight">
                    <span className="min-w-0 break-words">{title}</span>
                    <ArrowRight
                        aria-hidden="true"
                        className={cn(
                            "size-4 shrink-0 text-muted-foreground transition-[color,transform] group-hover:text-primary group-hover:ltr:translate-x-1 group-hover:rtl:-translate-x-1",
                            isArabic && "rotate-180",
                        )}
                    />
                </h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {description}
                </p>
            </div>
        </Link>
    );
}

export default async function DashboardPage() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        redirect("/sign-in");
    }

    const [preferences, readingProgress, surahs] = await Promise.all([
        getPreferences(),
        getReadingProgress(),
        getSurahsMeta().catch(() => []),
    ]);
    const [
        dailyWird,
        practiceAssignments,
        assignedWork,
        groups,
        completedHizbs,
        nextGroupMeeting,
    ] = await Promise.all([
        getDailyWird(session.user.id, preferences.arabicEdition),
        getPracticeAssignments(session.user.id),
        getAssignedPracticeAssignments(session.user.id),
        getGroupsForUser(session.user.id),
        getMemorizationProgress(session.user.id),
        getNextGroupMeetingForUser(session.user.id),
    ]);
    const practiceAssignment = practiceAssignments[0] ?? null;
    const messages = await getMessages(preferences.language);
    const t = createTranslator({
        locale: preferences.language,
        messages,
        namespace: "Dashboard",
    });
    const wirdT = createTranslator({
        locale: preferences.language,
        messages,
        namespace: "Wird",
    });
    const practiceT = createTranslator({
        locale: preferences.language,
        messages,
        namespace: "Practice",
    });
    const groupsT = createTranslator({
        locale: preferences.language,
        messages,
        namespace: "Groups",
    });
    const assignmentsT = createTranslator({
        locale: preferences.language,
        messages,
        namespace: "Assignments",
    });
    const memorizationT = createTranslator({
        locale: preferences.language,
        messages,
        namespace: "Memorization",
    });
    const readyAssignmentCount = assignedWork.filter(
        (assignment) => assignment.status === "submitted",
    ).length;
    const nextMeetingLabel =
        nextGroupMeeting?.status === "upcoming"
            ? new Intl.DateTimeFormat(preferences.language, {
                  weekday: "long",
                  hour: "numeric",
                  minute: "2-digit",
                  timeZone: getMeetingDisplayTimezone(
                      nextGroupMeeting.timezone,
                      new Date(nextGroupMeeting.startsAt),
                  ),
              }).format(new Date(nextGroupMeeting.startsAt))
            : null;
    const localizedSurahName = (surahNumber: number) => {
        const surah = surahs.find((item) => item.number === surahNumber);
        return (
            surah?.[preferences.language === "ar" ? "name" : "englishName"] ??
            ""
        );
    };
    const assignmentRange = (assignment: (typeof assignedWork)[number]) =>
        practiceT("range", {
            startSurah: localizedSurahName(assignment.start.surahNumber),
            startAyah: assignment.start.ayahNumber,
            endSurah: localizedSurahName(assignment.end.surahNumber),
            endAyah: assignment.end.ayahNumber,
        });
    const focusAssignment = assignedWork[0] ?? null;
    const focusIsAssignment = Boolean(focusAssignment);
    const FocusIcon = focusIsAssignment ? CalendarCheck2 : MoonStar;
    const focusHref = focusAssignment
        ? focusAssignment.status === "submitted"
            ? "/assignments"
            : `/practice/${focusAssignment.id}/read`
        : dailyWird?.completed || dailyWird?.scheduledForFuture || !dailyWird
          ? "/wird"
          : "/wird/read";
    const focusEyebrow = focusAssignment
        ? focusAssignment.groupName
            ? assignmentsT("card.fromGroup", {
                  group: focusAssignment.groupName,
              })
            : assignmentsT("dashboard.eyebrow")
        : wirdT("dashboard.eyebrow");
    const focusTitle = focusAssignment
        ? assignmentsT(`card.kinds.${focusAssignment.kind}`)
        : dailyWird
          ? wirdT("today.goal", {
                amount: dailyWird.amount,
                unit: wirdT(`units.${dailyWird.unit}`),
            })
          : wirdT("dashboard.emptyTitle");
    const focusDescription = focusAssignment
        ? assignmentRange(focusAssignment)
        : dailyWird
          ? dailyWird.completed
              ? wirdT("dashboard.completed")
              : dailyWird.scheduledForFuture
                ? wirdT("dashboard.scheduled", { date: dailyWird.targetDate })
                : wirdT("dashboard.pending")
          : wirdT("dashboard.emptyDescription");
    const focusAction = focusAssignment
        ? focusAssignment.status === "submitted"
            ? assignmentsT("card.reviewPending")
            : focusAssignment.progress
              ? assignmentsT("card.continue")
              : assignmentsT("card.start")
        : !dailyWird
          ? wirdT("dashboard.setup")
          : dailyWird.scheduledForFuture
            ? wirdT("dashboard.viewPlan")
            : dailyWird.completed
              ? wirdT("dashboard.open")
              : dailyWird.progressGlobalAyah
                ? wirdT("today.continueReading")
                : wirdT("today.startReading");
    const savedNumber =
        preferences.readingMode === "page"
            ? readingProgress.lastPageNumber
            : readingProgress.lastSurahNumber;
    const currentNumber = savedNumber ?? 1;
    const readingLabel = t(
        preferences.readingMode === "page" ? "reading.page" : "reading.surah",
    );
    const continueReadingHref = `/quran/${preferences.readingMode}/${currentNumber}`;
    let readingHeading = t("reading.beginWith", {
        type: readingLabel,
        number: currentNumber,
    });

    if (savedNumber !== null) {
        readingHeading = t("reading.continueFrom", {
            type: readingLabel,
            number: currentNumber,
        });

        if (preferences.readingMode === "surah") {
            const surah = surahs.find((item) => item.number === savedNumber);
            const surahName = surah
                ? preferences.language === "ar"
                    ? surah.name
                    : surah.englishName
                : undefined;

            readingHeading = surahName
                ? t("reading.continueWith", { surah: surahName })
                : t("reading.continueGeneric");
        }
    }

    return (
        <main
            lang={preferences.language}
            dir={getTextDirection(preferences.language)}
            className={cn(
                "relative isolate min-h-dvh overflow-x-clip bg-background",
                preferences.language === "ar" && "arabic-ui",
            )}
        >
            <PageBackground />
            <div className="app-container ">
                <StickyAppHeader
                    navigation
                    className="-mx-4 px-4 sm:-mx-6 sm:px-6"
                />

                <section className="pb-12 pt-5 sm:pb-16 sm:pt-8">
                    <PageHeading
                        title={t("welcome", { name: session.user.name })}
                        description={t("introduction")}
                    />
                    <GuideDirectory welcome />

                    {nextGroupMeeting && (
                        <Link
                            href={`/groups/${nextGroupMeeting.groupId}`}
                            className="group mt-6 flex min-w-0 flex-col gap-4 app-card px-4 py-4 outline-none transition-[background-color,border-color,box-shadow] hover:border-primary/30 hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-ring sm:px-5 lg:flex-row lg:items-center lg:justify-between"
                        >
                            <div className="flex min-w-0 items-center gap-3.5">
                                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                                    {nextGroupMeeting.status === "active" ? (
                                        <Video
                                            aria-hidden="true"
                                            className="size-5"
                                        />
                                    ) : (
                                        <CalendarClock
                                            aria-hidden="true"
                                            className="size-5"
                                        />
                                    )}
                                </span>
                                <div className="min-w-0">
                                    <p className="text-[0.65rem] font-semibold tracking-[0.14em] text-primary uppercase">
                                        {groupsT(
                                            nextGroupMeeting.status === "active"
                                                ? "dashboard.meetingNowEyebrow"
                                                : "dashboard.nextMeetingEyebrow",
                                        )}
                                    </p>
                                    <h2 className="mt-1 break-words text-lg font-semibold tracking-tight">
                                        {nextGroupMeeting.groupName}
                                    </h2>
                                    <p className="mt-0.5 text-xs leading-5 text-muted-foreground sm:text-sm">
                                        {nextGroupMeeting.status === "active"
                                            ? groupsT(
                                                  "dashboard.meetingNowDescription",
                                              )
                                            : groupsT(
                                                  "dashboard.nextMeetingDescription",
                                                  {
                                                      date:
                                                          nextMeetingLabel ??
                                                          "",
                                                  },
                                              )}
                                    </p>
                                </div>
                            </div>
                            <span className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 self-stretch rounded-lg bg-primary/10 px-4 text-sm font-semibold text-primary transition-colors group-hover:bg-primary/15 lg:min-h-0 lg:self-auto lg:bg-transparent lg:px-0 group-hover:lg:bg-transparent">
                                {groupsT(
                                    nextGroupMeeting.status === "active"
                                        ? "dashboard.openMeeting"
                                        : "dashboard.openMeetingDetails",
                                )}
                                <ArrowRight
                                    aria-hidden="true"
                                    className={cn(
                                        "size-4 transition-transform group-hover:ltr:translate-x-1 group-hover:rtl:-translate-x-1",
                                        preferences.language === "ar" &&
                                            "rotate-180",
                                    )}
                                />
                            </span>
                        </Link>
                    )}

                    <section
                        className={cn(
                            "overflow-hidden app-card",
                            nextGroupMeeting ? "mt-4 sm:mt-5" : "mt-8 sm:mt-10",
                        )}
                    >
                        <div className="grid sm:grid-cols-2 lg:grid-cols-[minmax(0,1.5fr)_minmax(15rem,0.75fr)_minmax(15rem,0.75fr)]">
                            <div className="min-w-0 bg-primary/[0.035] px-4 py-5 sm:col-span-2 sm:px-6 sm:py-6 lg:col-span-1">
                                <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                        <FocusIcon
                                            aria-hidden="true"
                                            className="size-5"
                                        />
                                    </span>
                                    <div className="min-w-0">
                                        <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">
                                            {focusEyebrow}
                                        </p>
                                        <h2 className="mt-2 break-words text-xl font-semibold leading-relaxed tracking-tight sm:text-2xl">
                                            {focusTitle}
                                        </h2>
                                        <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                                            {focusDescription}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-6 grid gap-2 sm:flex sm:flex-wrap sm:items-center sm:ps-14">
                                    <Button
                                        asChild
                                        className="min-h-11 w-full rounded-xl px-5 shadow-sm shadow-primary/15 sm:w-auto"
                                    >
                                        <Link href={focusHref}>
                                            {focusAction}
                                            <ArrowRight
                                                aria-hidden="true"
                                                className={cn(
                                                    preferences.language ===
                                                        "ar" && "rotate-180",
                                                )}
                                            />
                                        </Link>
                                    </Button>
                                    {focusAssignment &&
                                        assignedWork.length > 1 && (
                                            <Button
                                                asChild
                                                variant="ghost"
                                                className="min-h-11 w-full rounded-xl px-4 sm:w-auto"
                                            >
                                                <Link href="/assignments">
                                                    {assignmentsT(
                                                        "dashboard.open",
                                                    )}
                                                </Link>
                                            </Button>
                                        )}
                                </div>
                            </div>

                            <div className="contents">
                                <Link
                                    href="/assignments"
                                    className="group grid min-w-0 grid-cols-[auto_minmax(0,1fr)] content-center items-start gap-3 border-border/50 border-t px-4 py-5 outline-none transition-colors hover:bg-muted/25 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-5 lg:border-t-0 lg:border-s lg:px-6"
                                >
                                    <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                        <CalendarCheck2
                                            aria-hidden="true"
                                            className="size-5"
                                        />
                                    </span>
                                    <div className="min-w-0">
                                        <p className="text-[0.65rem] font-semibold tracking-[0.14em] text-primary uppercase">
                                            {assignmentsT("dashboard.eyebrow")}
                                        </p>
                                        <div className="mt-1 flex items-baseline gap-2">
                                            <strong className="text-3xl font-semibold tabular-nums">
                                                {assignedWork.length}
                                            </strong>
                                            <span className="text-sm font-semibold">
                                                {assignmentsT(
                                                    "dashboard.title",
                                                )}
                                            </span>
                                        </div>
                                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                            {assignedWork.length > 0
                                                ? assignmentsT(
                                                      "dashboard.active",
                                                      {
                                                          count: assignedWork.length,
                                                          ready: readyAssignmentCount,
                                                      },
                                                  )
                                                : assignmentsT(
                                                      "dashboard.empty",
                                                  )}
                                        </p>
                                    </div>
                                </Link>

                                <Link
                                    href="/memorization"
                                    className="group grid min-w-0 grid-cols-[auto_minmax(0,1fr)] content-center items-start gap-3 border-border/50 border-t px-4 py-5 outline-none transition-colors hover:bg-muted/25 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:border-s sm:px-5 lg:border-t-0 lg:px-6"
                                >
                                    <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                        <Sparkles
                                            aria-hidden="true"
                                            className="size-5"
                                        />
                                    </span>
                                    <div className="min-w-0">
                                        <p className="text-[0.65rem] font-semibold tracking-[0.14em] text-primary uppercase">
                                            {memorizationT("dashboard.eyebrow")}
                                        </p>
                                        <div
                                            className="mt-1 flex items-baseline gap-1"
                                            dir="ltr"
                                        >
                                            <strong className="text-3xl font-semibold tabular-nums">
                                                {completedHizbs.length}
                                            </strong>
                                            <span className="text-xs text-muted-foreground">
                                                /60
                                            </span>
                                        </div>
                                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                            {memorizationT(
                                                "dashboard.description",
                                            )}
                                        </p>
                                        <div className="mt-2 h-1 overflow-hidden rounded-xl bg-primary/10">
                                            <div
                                                className="h-full rounded-full bg-primary"
                                                style={{
                                                    width: `${Math.round((completedHizbs.length / 60) * 100)}%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                </Link>
                            </div>
                        </div>
                    </section>

                    <section
                        className="mt-8 sm:mt-10"
                        aria-labelledby="dashboard-tools"
                    >
                        <h2
                            id="dashboard-tools"
                            className="text-xl font-semibold tracking-tight"
                        >
                            {t("tools.title")}
                        </h2>

                        <div
                            className={cn(
                                "mt-4 grid gap-3 sm:grid-cols-2",
                                !focusIsAssignment && "lg:grid-cols-3",
                            )}
                        >
                            {focusIsAssignment && (
                                <DashboardShortcut
                                    href="/wird"
                                    icon={
                                        dailyWird?.completed ? Check : MoonStar
                                    }
                                    eyebrow={wirdT("dashboard.eyebrow")}
                                    title={
                                        dailyWird
                                            ? wirdT("today.goal", {
                                                  amount: dailyWird.amount,
                                                  unit: wirdT(
                                                      `units.${dailyWird.unit}`,
                                                  ),
                                              })
                                            : wirdT("dashboard.emptyTitle")
                                    }
                                    description={
                                        dailyWird
                                            ? dailyWird.completed
                                                ? wirdT("dashboard.completed")
                                                : dailyWird.scheduledForFuture
                                                  ? wirdT(
                                                        "dashboard.scheduled",
                                                        {
                                                            date: dailyWird.targetDate,
                                                        },
                                                    )
                                                  : wirdT("dashboard.pending")
                                            : wirdT(
                                                  "dashboard.emptyDescription",
                                              )
                                    }
                                    isArabic={preferences.language === "ar"}
                                    emphasized={Boolean(
                                        dailyWird && !dailyWird.completed,
                                    )}
                                />
                            )}

                            <DashboardShortcut
                                href={continueReadingHref}
                                icon={BookOpen}
                                eyebrow={t("reading.eyebrow")}
                                title={readingHeading}
                                description={
                                    savedNumber
                                        ? t("reading.resumeDescription")
                                        : t("reading.startDescription")
                                }
                                isArabic={preferences.language === "ar"}
                            />

                            <DashboardShortcut
                                href="/practice"
                                icon={BookMarked}
                                eyebrow={practiceT("dashboard.eyebrow")}
                                title={
                                    practiceAssignment
                                        ? practiceT(
                                              `kinds.${practiceAssignment.kind}`,
                                          )
                                        : practiceT("dashboard.emptyTitle")
                                }
                                description={
                                    practiceAssignment
                                        ? assignmentRange(practiceAssignment)
                                        : practiceT(
                                              "dashboard.emptyDescription",
                                          )
                                }
                                isArabic={preferences.language === "ar"}
                                emphasized={Boolean(practiceAssignment)}
                            />

                            <DashboardShortcut
                                href="/groups"
                                icon={UsersRound}
                                eyebrow={groupsT("dashboard.eyebrow")}
                                title={groupsT("dashboard.title")}
                                description={groupsT(
                                    groups.length > 0
                                        ? "dashboard.activeDescription"
                                        : "dashboard.emptyDescription",
                                    { count: groups.length },
                                )}
                                isArabic={preferences.language === "ar"}
                            />
                        </div>
                    </section>
                </section>
            </div>
        </main>
    );
}
