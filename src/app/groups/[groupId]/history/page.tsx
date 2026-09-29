import { ArrowLeft, ArrowRight, History, UsersRound } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createTranslator } from "next-intl";
import PageBackground from "@/components/page-background";
import StickyAppHeader from "@/components/sticky-app-header";
import { Button } from "@/components/ui/button";
import UserMenu from "@/components/user-menu";
import { auth } from "@/features/auth/auth";
import MeetingHistory from "@/features/groups/components/meeting-history";
import { getGroupMeetingForUser } from "@/features/groups/server/get-group-meeting";
import { getGroupForUser } from "@/features/groups/server/get-groups";
import getMeetingHistory from "@/features/groups/server/get-meeting-history";
import getReadingProgress from "@/features/reading-progress/server/get-reading-progress";
import getPreferences from "@/features/settings/server/get-preferences";
import { getMessages, getTextDirection } from "@/i18n/config";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;

export default async function MeetingHistoryPage({
    params,
    searchParams,
}: {
    params: Promise<{ groupId: string }>;
    searchParams: Promise<{ page?: string }>;
}) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) redirect("/sign-in");

    const [{ groupId }, query] = await Promise.all([params, searchParams]);
    const requestedPage = Number.parseInt(query.page ?? "1", 10);
    const page = Number.isFinite(requestedPage)
        ? Math.max(1, requestedPage)
        : 1;
    const [preferences, readingProgress, group] = await Promise.all([
        getPreferences(),
        getReadingProgress(),
        getGroupForUser(groupId, session.user.id),
    ]);
    if (!group) notFound();

    const isAdmin = group.role === "admin";
    const [meeting, historyRows, messages] = await Promise.all([
        getGroupMeetingForUser(groupId, session.user.id),
        getMeetingHistory(groupId, session.user.id, isAdmin, {
            limit: PAGE_SIZE + 1,
            offset: (page - 1) * PAGE_SIZE,
        }),
        getMessages(preferences.language),
    ]);
    if (!meeting) notFound();

    const hasNext = historyRows.length > PAGE_SIZE;
    const history = historyRows.slice(0, PAGE_SIZE);
    const t = createTranslator({
        locale: preferences.language,
        messages,
        namespace: "Groups.meeting.history",
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
    const pageHref = (target: number) =>
        `/groups/${groupId}/history?page=${target}`;

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
                <StickyAppHeader navigation className="-mx-4 px-4">
                    <Link
                        href={`/groups/${groupId}`}
                        className="flex min-w-0 items-center gap-3 rounded-md"
                    >
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                            <UsersRound className="size-5" />
                        </span>
                        <span className="max-w-52 truncate text-sm font-semibold">
                            {group.name}
                        </span>
                    </Link>
                    <UserMenu
                        name={session.user.name}
                        image={session.user.image}
                        continueReadingHref={`/quran/${preferences.readingMode}/${readingNumber}`}
                        labels={accountLabels}
                    />
                </StickyAppHeader>

                <section className="py-10 sm:py-14">
                    <div className="flex max-w-3xl items-start gap-4">
                        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <History className="size-6" />
                        </span>
                        <div>
                            <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">
                                {t("eyebrow")}
                            </p>
                            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                                {t("title")}
                            </h1>
                            <p className="mt-3 leading-7 text-muted-foreground">
                                {t(
                                    isAdmin
                                        ? "descriptionAdmin"
                                        : "descriptionMember",
                                )}
                            </p>
                        </div>
                    </div>

                    <MeetingHistory
                        groupId={groupId}
                        history={history}
                        locale={preferences.language}
                        timezone={meeting.timezone}
                        isAdmin={isAdmin}
                        openFirst
                        showHeading={false}
                    />

                    {(page > 1 || hasNext) && (
                        <nav
                            aria-label={t("pagination")}
                            className="mt-7 flex items-center justify-between gap-3 border-border/50 border-t pt-6"
                        >
                            {page > 1 ? (
                                <Button asChild variant="outline">
                                    <Link href={pageHref(page - 1)}>
                                        <ArrowLeft
                                            className={cn(
                                                "size-4",
                                                isArabic && "rotate-180",
                                            )}
                                        />
                                        {t("previous")}
                                    </Link>
                                </Button>
                            ) : (
                                <span />
                            )}
                            <span className="text-sm text-muted-foreground">
                                {t("page", { page })}
                            </span>
                            {hasNext ? (
                                <Button asChild variant="outline">
                                    <Link href={pageHref(page + 1)}>
                                        {t("next")}
                                        <ArrowRight
                                            className={cn(
                                                "size-4",
                                                isArabic && "rotate-180",
                                            )}
                                        />
                                    </Link>
                                </Button>
                            ) : (
                                <span />
                            )}
                        </nav>
                    )}
                </section>
            </div>
        </main>
    );
}
