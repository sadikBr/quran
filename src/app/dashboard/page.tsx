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
import StickyAppHeader from "@/components/sticky-app-header";
import { Button } from "@/components/ui/button";
import UserMenu from "@/components/user-menu";
import { auth } from "@/features/auth/auth";
import { getGroupsForUser } from "@/features/groups/server/get-groups";
import { getNextGroupMeetingForUser } from "@/features/groups/server/get-next-group-meeting";
import { getMeetingDisplayTimezone } from "@/features/groups/server/meeting-schedule";
import getMemorizationProgress from "@/features/memorization/server/get-memorization-progress";
import {
    getAssignedPracticeAssignments,
    getPracticeAssignments,
} from "@/features/practice/server/get-practice-assignment";
import QuranAudioProvider from "@/features/quran/components/quran-audio-provider";
import getQuranNavigationMeta from "@/features/quran/server/get-quran-navigation-meta";
import getSurahsMeta from "@/features/quran/server/get-surahs-meta";
import { getWarshChapters } from "@/features/quran/server/get-warsh-mushaf";
import getReadingProgress from "@/features/reading-progress/server/get-reading-progress";
import SavedAyahsSection from "@/features/saved-ayahs/components/saved-ayahs-section";
import getBookmarkCollections from "@/features/saved-ayahs/server/get-bookmark-collections";
import getSavedAyahs from "@/features/saved-ayahs/server/get-saved-ayahs";
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
            className="group grid min-w-0 grid-cols-[2.5rem_minmax(0,1fr)] items-start gap-3 rounded-xl px-3 py-4 outline-none transition-[background-color,box-shadow] hover:bg-background/70 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring"
        >
            <span
                className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-full transition-[background-color,color]",
                    emphasized
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-primary group-hover:bg-primary group-hover:text-primary-foreground",
                )}
            >
                <Icon aria-hidden="true" className="size-5" />
            </span>
            <div className="min-w-0">
                <p className="text-[0.65rem] font-semibold tracking-[0.14em] text-primary uppercase">
                    {eyebrow}
                </p>
                <h3 className="mt-1.5 flex min-w-0 items-center gap-2 text-base font-semibold tracking-tight">
                    <span className="min-w-0 truncate">{title}</span>
                    <ArrowRight
                        aria-hidden="true"
                        className={cn(
                            "size-4 shrink-0 text-muted-foreground transition-[color,transform] group-hover:text-primary group-hover:ltr:translate-x-1 group-hover:rtl:-translate-x-1",
                            isArabic && "rotate-180",
                        )}
                    />
                </h3>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
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

    const [
        preferences,
        readingProgress,
        savedAyahs,
        bookmarkCollections,
        surahs,
        hafsNavigation,
    ] = await Promise.all([
        getPreferences(),
        getReadingProgress(),
        getSavedAyahs(session.user.id),
        getBookmarkCollections(session.user.id),
        getSurahsMeta().catch(() => []),
        getQuranNavigationMeta().catch(() => null),
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
    const warshChapters =
        preferences.riwayah === "warsh" ? await getWarshChapters() : [];
    const warshBySurah = new Map(
        warshChapters.map((chapter) => [chapter.id, chapter]),
    );
    const surahOffsets = new Map<number, number>();
    let ayahOffset = 0;
    for (const surah of surahs) {
        surahOffsets.set(surah.number, ayahOffset);
        ayahOffset += surah.numberOfAyahs;
    }
    const hafsPageForAyah = (
        globalAyahNumber: number,
        fallbackPageNumber: number,
    ) => {
        if (!hafsNavigation) return fallbackPageNumber;

        let pageNumber = 1;

        for (const page of hafsNavigation.pages) {
            if (page.globalAyahNumber > globalAyahNumber) break;
            pageNumber = page.number;
        }

        return pageNumber;
    };
    const messages = await getMessages(preferences.language);
    const t = createTranslator({
        locale: preferences.language,
        messages,
        namespace: "Dashboard",
    });
    const homeT = createTranslator({
        locale: preferences.language,
        messages,
        namespace: "Home",
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
        : dailyWird?.completed || !dailyWird
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
                ? wirdT("dashboard.restDay")
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

    const localizedSavedAyahs = savedAyahs.map((ayah) => {
        const surah = surahs.find((item) => item.number === ayah.surahNumber);
        const hafsAyahNumber =
            ayah.globalAyahNumber - (surahOffsets.get(ayah.surahNumber) ?? 0);
        const warshChapter = warshBySurah.get(ayah.surahNumber);
        const exactWarshVerse = warshChapter?.verses.find(
            (verse) =>
                verse.number === ayah.ayahNumber &&
                verse.number_in_hafs.includes(hafsAyahNumber),
        );
        const warshVerse =
            exactWarshVerse ??
            warshChapter?.verses.find((verse) =>
                verse.number_in_hafs.includes(hafsAyahNumber),
            );

        return {
            ...ayah,
            ayahNumber: warshVerse?.number ?? hafsAyahNumber,
            pageNumber:
                warshVerse?.page_number ??
                hafsPageForAyah(ayah.globalAyahNumber, ayah.pageNumber),
            arabicText: warshVerse?.text ?? ayah.arabicText,
            surahName:
                preferences.language === "ar"
                    ? (surah?.name ?? ayah.surahName)
                    : (surah?.englishName ?? ayah.surahName),
        };
    });
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
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
                <StickyAppHeader
                    navigation
                    className="-mx-4 px-4 sm:-mx-6 sm:px-6"
                >
                    <Link
                        href="/"
                        className="group flex items-center gap-3 rounded-md outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-transform group-hover:-rotate-3">
                            <BookOpen aria-hidden="true" className="size-5" />
                        </span>
                        <span className="text-sm font-semibold tracking-wide">
                            {homeT("brand")}
                        </span>
                    </Link>
                    <UserMenu
                        name={session.user.name}
                        image={session.user.image}
                        continueReadingHref={continueReadingHref}
                        labels={accountLabels}
                    />
                </StickyAppHeader>

                <section className="py-7 sm:py-12">
                    <div className="max-w-3xl">
                        <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">
                            {t("eyebrow")}
                        </p>
                        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                            {t("welcome", { name: session.user.name })}
                        </h1>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                            {t("introduction")}
                        </p>
                    </div>

                    {nextGroupMeeting && (
                        <Link
                            href={`/groups/${nextGroupMeeting.groupId}`}
                            className="group mt-6 flex min-w-0 flex-col gap-4 rounded-2xl border border-primary/20 bg-card/60 px-4 py-4 shadow-sm shadow-primary/5 outline-none transition-[background-color,border-color,box-shadow] hover:border-primary/30 hover:bg-card/80 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring sm:px-5 lg:flex-row lg:items-center lg:justify-between"
                        >
                            <div className="flex min-w-0 items-center gap-3.5">
                                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
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
                                    <h2 className="mt-1 truncate text-lg font-semibold tracking-tight">
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
                            "overflow-hidden rounded-3xl border border-border/60 bg-card/40 shadow-sm",
                            nextGroupMeeting ? "mt-4 sm:mt-5" : "mt-8 sm:mt-10",
                        )}
                    >
                        <div className="grid sm:grid-cols-2 lg:grid-cols-[minmax(0,1.5fr)_minmax(15rem,0.75fr)_minmax(15rem,0.75fr)]">
                            <div className="min-w-0 px-2 py-7 sm:col-span-2 sm:px-5 sm:py-8 lg:col-span-1 lg:px-7 lg:py-9">
                                <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                                    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
                                        <FocusIcon
                                            aria-hidden="true"
                                            className="size-5"
                                        />
                                    </span>
                                    <div className="min-w-0">
                                        <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">
                                            {focusEyebrow}
                                        </p>
                                        <h2 className="mt-2 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl lg:text-3xl lg:leading-[1.15] xl:text-4xl">
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
                                    className="group grid min-w-0 grid-cols-[auto_minmax(0,1fr)] content-center items-start gap-3 border-border/50 border-t px-2 py-6 outline-none transition-colors hover:bg-muted/25 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-5 lg:border-t-0 lg:border-s lg:px-6"
                                >
                                    <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
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
                                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
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
                                    className="group grid min-w-0 grid-cols-[auto_minmax(0,1fr)] content-center items-start gap-3 border-border/50 border-t px-2 py-6 outline-none transition-colors hover:bg-muted/25 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:border-s sm:px-5 lg:border-t-0 lg:px-6"
                                >
                                    <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
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
                                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
                                            {memorizationT(
                                                "dashboard.description",
                                            )}
                                        </p>
                                        <div className="mt-2 h-1 overflow-hidden rounded-full bg-primary/10">
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
                        className="mt-14 sm:mt-20"
                        aria-labelledby="dashboard-tools"
                    >
                        <div className="max-w-xl">
                            <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">
                                {t("tools.eyebrow")}
                            </p>
                            <h2
                                id="dashboard-tools"
                                className="mt-2 text-2xl font-semibold tracking-tight"
                            >
                                {t("tools.title")}
                            </h2>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                {t("tools.description")}
                            </p>
                        </div>

                        <div
                            className={cn(
                                "mt-6 grid gap-1 rounded-2xl bg-muted/25 p-1.5 ring-1 ring-border/50 sm:grid-cols-2 sm:p-2",
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
                                                  ? wirdT("dashboard.restDay")
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

                    <QuranAudioProvider>
                        <SavedAyahsSection
                            savedAyahs={localizedSavedAyahs}
                            collections={bookmarkCollections}
                            readingMode={preferences.readingMode}
                        />
                    </QuranAudioProvider>
                </section>
            </div>
        </main>
    );
}
