import {
    AlertCircle,
    ArrowLeft,
    ArrowRight,
    BookMarked,
    CalendarCheck2,
    CalendarDays,
    CheckCircle2,
    Clock3,
    RefreshCcw,
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
import getMemberWeeklyView, {
    type WeeklyAssignment,
    type WeeklyAssignmentPeriod,
} from "@/features/groups/server/get-member-weekly-view";
import getReadingProgress from "@/features/reading-progress/server/get-reading-progress";
import getPreferences from "@/features/settings/server/get-preferences";
import { getMessages, getTextDirection } from "@/i18n/config";
import { cn } from "@/lib/utils";

const sectionOrder: WeeklyAssignmentPeriod[] = [
    "overdue",
    "this_week",
    "upcoming",
];

export default async function WeeklyPage() {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) redirect("/sign-in");

    const [preferences, readingProgress, weekly] = await Promise.all([
        getPreferences(),
        getReadingProgress(),
        getMemberWeeklyView(session.user.id),
    ]);
    const messages = await getMessages(preferences.language);
    const t = createTranslator({
        locale: preferences.language,
        messages,
        namespace: "Weekly",
    });
    const homeT = createTranslator({
        locale: preferences.language,
        messages,
        namespace: "Home",
    });
    const isArabic = preferences.language === "ar";
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
    const dateFormatter = new Intl.DateTimeFormat(preferences.language, {
        day: "numeric",
        month: "short",
        timeZone: "UTC",
    });
    const dueDateFormatter = new Intl.DateTimeFormat(preferences.language, {
        dateStyle: "medium",
        timeZone: "UTC",
    });
    const totalAyahs = weekly.assignments.reduce(
        (total, assignment) => total + assignment.totalAyahs,
        0,
    );
    const completedAyahs = weekly.assignments.reduce(
        (total, assignment) => total + assignment.completedAyahs,
        0,
    );
    const overallPercentage = totalAyahs
        ? Math.round((completedAyahs / totalAyahs) * 100)
        : 0;
    const readyCount = weekly.assignments.filter(
        (assignment) => assignment.status === "submitted",
    ).length;
    const surahName = (number: number) => {
        const surah = weekly.surahs.find((item) => item.number === number);
        return isArabic ? surah?.name : surah?.englishName;
    };

    function assignmentCard(assignment: WeeklyAssignment) {
        const Icon =
            assignment.kind === "memorization" ? BookMarked : RefreshCcw;
        const dueLabel = assignment.dueAt
            ? t(assignment.period === "overdue" ? "card.overdue" : "card.due", {
                  date: dueDateFormatter.format(assignment.dueAt),
              })
            : t("card.noDueDate");

        return (
            <article
                key={assignment.id}
                className={cn(
                    "relative px-1 py-6 sm:px-3 sm:py-7",
                    assignment.period === "overdue" &&
                        "border-s-2 border-s-destructive/40 ps-4",
                )}
            >
                <div className="flex items-start justify-between gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Icon aria-hidden="true" className="size-5" />
                    </span>
                    <span className="rounded-full bg-muted/60 px-3 py-1 text-xs text-muted-foreground">
                        {t(`card.statuses.${assignment.status}`)}
                    </span>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-primary">
                    {assignment.groupId && assignment.groupName ? (
                        <Link
                            href={`/groups/${assignment.groupId}`}
                            className="underline-offset-4 hover:underline"
                        >
                            {t("card.fromGroup", {
                                group: assignment.groupName,
                            })}
                        </Link>
                    ) : null}
                    <span className="text-muted-foreground">·</span>
                    <span>{t(`card.kinds.${assignment.kind}`)}</span>
                </div>
                <h3 className="mt-2 text-lg font-semibold leading-8">
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
                    <span
                        className={cn(
                            "inline-flex items-center gap-1.5",
                            assignment.period === "overdue" &&
                                "text-destructive",
                        )}
                    >
                        <CalendarDays className="size-3.5" />
                        {dueLabel}
                    </span>
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
                    <Link href={`/practice/${assignment.id}/read`}>
                        {assignment.status === "submitted"
                            ? t("card.reviewPending")
                            : assignment.progress
                              ? t("card.continue")
                              : t("card.start")}
                        <ArrowRight
                            className={cn("size-4", isArabic && "rotate-180")}
                        />
                    </Link>
                </Button>
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
                    <Link
                        href="/"
                        className="flex items-center gap-3 rounded-md"
                    >
                        <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                            <CalendarCheck2 className="size-5" />
                        </span>
                        <span className="text-sm font-semibold tracking-wide">
                            {t("header")}
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
                        href="/dashboard"
                        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
                    >
                        <ArrowLeft
                            className={cn("size-4", isArabic && "rotate-180")}
                        />
                        {t("back")}
                    </Link>

                    <div className="mt-9">
                        <div className="max-w-3xl">
                            <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
                                {t("eyebrow")}
                            </p>
                            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                                {t("title")}
                            </h1>
                            <p className="mt-4 leading-7 text-muted-foreground">
                                {t("description")}
                            </p>
                        </div>

                        <div className="mt-7 grid items-center gap-4 border-border/50 border-y py-4 sm:grid-cols-[auto_minmax(8rem,1fr)_auto] sm:gap-6">
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold text-primary">
                                <span className="inline-flex items-center gap-2">
                                    <CalendarDays className="size-4" />
                                    {t("weekRange", {
                                        start: dateFormatter.format(
                                            weekly.weekStart,
                                        ),
                                        end: dateFormatter.format(
                                            weekly.weekEnd,
                                        ),
                                    })}
                                </span>
                                {weekly.assignments.length > 0 && (
                                    <span className="text-muted-foreground">
                                        {t("summary.active", {
                                            count: weekly.assignments.length,
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
                                    style={{ width: `${overallPercentage}%` }}
                                />
                            </div>
                            <strong className="text-2xl font-semibold text-primary tabular-nums sm:text-end">
                                {overallPercentage}%
                            </strong>
                        </div>
                    </div>

                    {weekly.assignments.length > 0 ? (
                        sectionOrder.map((period) => {
                            const assignments = weekly.assignments.filter(
                                (assignment) => assignment.period === period,
                            );
                            if (assignments.length === 0) return null;
                            const SectionIcon =
                                period === "overdue"
                                    ? AlertCircle
                                    : period === "this_week"
                                      ? CalendarCheck2
                                      : Clock3;
                            return (
                                <section key={period} className="mt-12">
                                    <div className="flex items-start gap-3">
                                        <span
                                            className={cn(
                                                "flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary",
                                                period === "overdue" &&
                                                    "bg-destructive/10 text-destructive",
                                            )}
                                        >
                                            <SectionIcon className="size-5" />
                                        </span>
                                        <div>
                                            <h2 className="text-xl font-semibold">
                                                {t(`sections.${period}.title`)}
                                            </h2>
                                            <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                                {t(
                                                    `sections.${period}.description`,
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="mt-5 divide-y divide-border/60 border-border/60 border-y">
                                        {assignments.map(assignmentCard)}
                                    </div>
                                </section>
                            );
                        })
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
                                    className="w-full rounded-full sm:w-auto"
                                >
                                    <Link href="/practice">
                                        {t("empty.practice")}
                                    </Link>
                                </Button>
                                <Button
                                    asChild
                                    variant="ghost"
                                    className="w-full rounded-full sm:w-auto"
                                >
                                    <Link href="/groups">
                                        {t("empty.groups")}
                                    </Link>
                                </Button>
                            </div>
                        </section>
                    )}
                </section>
            </div>
        </main>
    );
}
