import { ArrowLeft, ArrowRight, History } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createTranslator } from "next-intl";
import PageBackground from "@/components/page-background";
import PageHeading from "@/components/page-heading";
import StickyAppHeader from "@/components/sticky-app-header";
import { Button } from "@/components/ui/button";
import { auth } from "@/features/auth/auth";
import MeetingHistory from "@/features/groups/components/meeting-history";
import { getGroupMeetingForUser } from "@/features/groups/server/get-group-meeting";
import { getGroupForUser } from "@/features/groups/server/get-groups";
import getMeetingHistory from "@/features/groups/server/get-meeting-history";
import getPreferences from "@/features/settings/server/get-preferences";
import { getMessages, getTextDirection } from "@/i18n/config";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;

export default async function MeetingHistoryPage({
    params,
    searchParams,
}: {
    params: Promise<{ groupId: string }>;
    searchParams: Promise<{ page?: string; pending?: string }>;
}) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) redirect("/sign-in");

    const [{ groupId }, query] = await Promise.all([params, searchParams]);
    const requestedPage = Number.parseInt(query.page ?? "1", 10);
    const page = Number.isFinite(requestedPage)
        ? Math.max(1, requestedPage)
        : 1;
    const [preferences, group] = await Promise.all([
        getPreferences(),
        getGroupForUser(groupId, session.user.id),
    ]);
    if (!group) notFound();

    const isAdmin = group.role === "supervisor";
    const pendingOnly = isAdmin && query.pending === "1";
    const [meeting, historyRows, messages] = await Promise.all([
        getGroupMeetingForUser(groupId, session.user.id),
        getMeetingHistory(groupId, session.user.id, isAdmin, {
            limit: PAGE_SIZE + 1,
            offset: (page - 1) * PAGE_SIZE,
            pendingOnly,
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
    const isArabic = preferences.language === "ar";
    const pageHref = (target: number) =>
        `/groups/${groupId}/history?page=${target}${pendingOnly ? "&pending=1" : ""}`;

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
                <StickyAppHeader navigation className="-mx-4 px-4" />

                <section className="pb-12 pt-5 sm:pb-16 sm:pt-8">
                    <Link
                        href={`/groups/${groupId}`}
                        className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        <ArrowLeft
                            aria-hidden="true"
                            className="size-4 shrink-0 rtl:rotate-180"
                        />
                        <bdi className="break-words">{group.name}</bdi>
                    </Link>
                    <PageHeading
                        title={t(pendingOnly ? "pendingTitle" : "title")}
                        description={t(
                            isAdmin ? "descriptionAdmin" : "descriptionMember",
                        )}
                        icon={<History />}
                    />

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
