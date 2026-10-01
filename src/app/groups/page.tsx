import { ArrowRight, Shield, UsersRound } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createTranslator } from "next-intl";
import PageBackground from "@/components/page-background";
import PageHeading from "@/components/page-heading";
import StickyAppHeader from "@/components/sticky-app-header";
import { auth } from "@/features/auth/auth";
import GroupForms from "@/features/groups/components/group-forms";
import { getGroupsForUser } from "@/features/groups/server/get-groups";
import getPreferences from "@/features/settings/server/get-preferences";
import { getMessages, getTextDirection } from "@/i18n/config";
import { cn } from "@/lib/utils";

export default async function GroupsPage({
    searchParams,
}: {
    searchParams: Promise<{ join?: string }>;
}) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) redirect("/sign-in");

    const [preferences, groups, params] = await Promise.all([
        getPreferences(),
        getGroupsForUser(session.user.id),
        searchParams,
    ]);
    const messages = await getMessages(preferences.language);
    const t = createTranslator({
        locale: preferences.language,
        messages,
        namespace: "Groups",
    });
    const isArabic = preferences.language === "ar";

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
                <StickyAppHeader
                    navigation
                    className="-mx-4 px-4 sm:-mx-6 sm:px-6"
                />

                <section className="pb-12 pt-5 sm:pb-16 sm:pt-8">
                    <PageHeading
                        title={t("title")}
                        description={t("description")}
                        icon={<UsersRound />}
                    />

                    {groups.length > 0 && (
                        <div className="mt-8 divide-y divide-border/55 overflow-hidden app-card sm:mt-8">
                            {groups.map((group) => (
                                <Link
                                    href={`/groups/${group.id}`}
                                    key={group.id}
                                    className="group grid grid-cols-[2.75rem_minmax(0,1fr)] items-start gap-x-3 gap-y-3 px-4 py-5 transition-colors hover:bg-muted/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:gap-5 sm:px-5 sm:py-6"
                                >
                                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                        <UsersRound
                                            aria-hidden="true"
                                            className="size-5"
                                        />
                                    </span>
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h2 className="break-words text-lg font-semibold group-hover:text-primary">
                                                {group.name}
                                            </h2>
                                            <span className="inline-flex items-center gap-1.5 rounded-full bg-background/60 px-3 py-1 text-xs text-muted-foreground ring-1 ring-border/50">
                                                {group.role ===
                                                    "supervisor" && (
                                                    <Shield className="size-3 text-primary" />
                                                )}
                                                {t(
                                                    `role.${group.role === "member" && group.isReviewer ? (group.reviewerScope === "supervisor" ? "supervisorReviewer" : "reviewer") : group.role}`,
                                                )}
                                            </span>
                                        </div>
                                        {group.description && (
                                            <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                                                {group.description}
                                            </p>
                                        )}
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {t("members", {
                                                count: group.memberCount,
                                            })}
                                        </p>
                                    </div>
                                    <span className="col-start-2 inline-flex items-center gap-2 text-sm font-medium text-primary sm:col-start-auto">
                                        {t("open")}
                                        <ArrowRight
                                            aria-hidden="true"
                                            className="size-4 rtl:rotate-180"
                                        />
                                    </span>
                                </Link>
                            ))}
                        </div>
                    )}

                    <GroupForms
                        initialInviteCode={params.join ?? ""}
                        firstGroup={groups.length === 0}
                    />
                </section>
            </div>
        </main>
    );
}
