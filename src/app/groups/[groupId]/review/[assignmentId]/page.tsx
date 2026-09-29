import { CalendarCheck2 } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createTranslator } from "next-intl";
import PageBackground from "@/components/page-background";
import StickyAppHeader from "@/components/sticky-app-header";
import { Button } from "@/components/ui/button";
import UserMenu from "@/components/user-menu";
import { auth } from "@/features/auth/auth";
import AssignmentReview from "@/features/groups/components/assignment-review";
import getAssignmentReview from "@/features/groups/server/get-assignment-review";
import getReviewQueue from "@/features/groups/server/get-review-queue";
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
    const queue = await getReviewQueue(groupId, session.user.id);

    const messages = await getMessages(preferences.language);
    const t = createTranslator({
        locale: preferences.language,
        messages,
        namespace: "Groups.review",
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
                <StickyAppHeader navigation className="-mx-4 px-4">
                    <Link
                        href={`/assignments?view=manage&group=${groupId}`}
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
                    <div className={isReady ? "hidden" : "max-w-3xl"}>
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
                                <Link
                                    href={
                                        queue[0]
                                            ? `/groups/${groupId}/review/${queue[0].id}`
                                            : `/assignments?view=manage&group=${groupId}`
                                    }
                                >
                                    {queue[0]
                                        ? t("startQueue", {
                                              count: queue.length,
                                          })
                                        : t("returnToGroup")}
                                </Link>
                            </Button>
                        </section>
                    ) : (
                        <AssignmentReview
                            review={review}
                            readerGroups={readerGroups}
                            pendingCount={queue.length}
                        />
                    )}
                </section>
            </div>
        </main>
    );
}
