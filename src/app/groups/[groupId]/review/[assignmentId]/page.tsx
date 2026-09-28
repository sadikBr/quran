import {
    ArrowLeft,
    BookMarked,
    CalendarCheck2,
    RefreshCcw,
} from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createTranslator } from "next-intl";
import PageBackground from "@/components/page-background";
import StickyAppHeader from "@/components/sticky-app-header";
import { Button } from "@/components/ui/button";
import UserMenu from "@/components/user-menu";
import { auth } from "@/features/auth/auth";
import AssignmentReviewReader from "@/features/groups/components/assignment-review-reader";
import ReviewDecisionForm from "@/features/groups/components/review-decision-form";
import getAssignmentReview from "@/features/groups/server/get-assignment-review";
import getPracticeReaderData from "@/features/practice/server/get-practice-reader-data";
import getReadingProgress from "@/features/reading-progress/server/get-reading-progress";
import getPreferences from "@/features/settings/server/get-preferences";
import { getMessages, getTextDirection } from "@/i18n/config";
import { cn } from "@/lib/utils";

export default async function AssignmentReviewPage({
    params,
}: {
    params: Promise<{ groupId: string; assignmentId: string }>;
}) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) redirect("/sign-in");

    const { groupId, assignmentId } = await params;
    const [preferences, review, readingProgress] = await Promise.all([
        getPreferences(),
        getAssignmentReview(groupId, assignmentId, session.user.id),
        getReadingProgress(),
    ]);
    if (!review) notFound();

    const messages = await getMessages(preferences.language);
    const t = createTranslator({
        locale: preferences.language,
        messages,
        namespace: "Groups.review",
    });
    const practiceT = createTranslator({
        locale: preferences.language,
        messages,
        namespace: "Practice",
    });
    const homeT = createTranslator({
        locale: preferences.language,
        messages,
        namespace: "Home",
    });
    const isArabic = preferences.language === "ar";
    const assignment = review.assignment;
    const isReady = assignment.status === "submitted";
    const readerGroups = isReady
        ? await getPracticeReaderData(assignment, {
              ...preferences,
              showTranslation: false,
          })
        : [];
    const surahName = (number: number) => {
        const surah = readerGroups.find(
            (group) => group.surah.number === number,
        )?.surah;
        return isArabic ? surah?.name : surah?.englishName;
    };
    const dateFormatter = new Intl.DateTimeFormat(preferences.language, {
        dateStyle: "medium",
        timeZone: "Africa/Casablanca",
    });
    const KindIcon =
        assignment.kind === "memorization" ? BookMarked : RefreshCcw;
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
            <div className="mx-auto max-w-6xl px-4">
                <StickyAppHeader className="-mx-4 px-4">
                    <Link
                        href={`/groups/${groupId}`}
                        className="inline-flex min-w-0 items-center gap-3"
                    >
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                            <CalendarCheck2 className="size-5" />
                        </span>
                        <span className="truncate text-sm font-semibold">
                            {assignment.groupName}
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
                        href={`/groups/${groupId}`}
                        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
                    >
                        <ArrowLeft
                            className={cn("size-4", isArabic && "rotate-180")}
                        />
                        {t("back", { group: assignment.groupName ?? "" })}
                    </Link>

                    <div className="mt-9 max-w-3xl">
                        <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
                            {t("eyebrow")}
                        </p>
                        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                            {t("title", { name: review.assignee.name })}
                        </h1>
                        <p className="mt-4 leading-7 text-muted-foreground">
                            {t("description")}
                        </p>
                    </div>

                    {!isReady ? (
                        <section className="mt-10 rounded-3xl bg-muted/40 p-8 text-center ring-1 ring-border/50">
                            <CalendarCheck2 className="mx-auto size-7 text-primary" />
                            <h2 className="mt-4 text-xl font-semibold">
                                {t("notReadyTitle")}
                            </h2>
                            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
                                {t("notReadyDescription")}
                            </p>
                            <Button asChild className="mt-6 rounded-xl">
                                <Link href={`/groups/${groupId}`}>
                                    {t("returnToGroup")}
                                </Link>
                            </Button>
                        </section>
                    ) : (
                        <>
                            <section className="mt-10 grid gap-4 rounded-3xl bg-muted/35 p-5 ring-1 ring-border/50 sm:grid-cols-2 sm:p-7 lg:grid-cols-4">
                                <div>
                                    <p className="text-xs text-muted-foreground">
                                        {t("learner")}
                                    </p>
                                    <p className="mt-1 font-semibold">
                                        {review.assignee.name}
                                    </p>
                                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                        {review.assignee.email}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">
                                        {t("assignment")}
                                    </p>
                                    <p className="mt-1 inline-flex items-center gap-2 font-semibold">
                                        <KindIcon className="size-4 text-primary" />
                                        {practiceT(`kinds.${assignment.kind}`)}
                                    </p>
                                </div>
                                <div className="sm:col-span-2">
                                    <p className="text-xs text-muted-foreground">
                                        {practiceT("range", {
                                            startSurah:
                                                surahName(
                                                    assignment.start
                                                        .surahNumber,
                                                ) ??
                                                assignment.start.surahNumber,
                                            startAyah:
                                                assignment.start.ayahNumber,
                                            endSurah:
                                                surahName(
                                                    assignment.end.surahNumber,
                                                ) ?? assignment.end.surahNumber,
                                            endAyah: assignment.end.ayahNumber,
                                        })}
                                    </p>
                                    {assignment.submittedAt && (
                                        <p className="mt-2 font-semibold text-primary">
                                            {t("submitted", {
                                                date: dateFormatter.format(
                                                    assignment.submittedAt,
                                                ),
                                            })}
                                        </p>
                                    )}
                                </div>
                            </section>

                            {assignment.instructions && (
                                <section className="mt-6 rounded-2xl bg-background/55 px-5 py-4 ring-1 ring-border/50">
                                    <p className="text-xs font-semibold text-primary">
                                        {t("instructions")}
                                    </p>
                                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                        {assignment.instructions}
                                    </p>
                                </section>
                            )}

                            <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
                                <section>
                                    <h2 className="mb-5 text-xl font-semibold">
                                        {t("quranText")}
                                    </h2>
                                    <AssignmentReviewReader
                                        groups={readerGroups}
                                        riwayah={assignment.riwayah}
                                    />
                                </section>
                                <div className="lg:sticky lg:top-24">
                                    <ReviewDecisionForm
                                        groupId={groupId}
                                        assignmentId={assignmentId}
                                    />
                                </div>
                            </div>
                        </>
                    )}
                </section>
            </div>
        </main>
    );
}
