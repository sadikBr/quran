import { ArrowRight, Shield, UsersRound } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createTranslator } from "next-intl";
import PageBackground from "@/components/page-background";
import StickyAppHeader from "@/components/sticky-app-header";
import { Button } from "@/components/ui/button";
import UserMenu from "@/components/user-menu";
import { auth } from "@/features/auth/auth";
import GroupForms from "@/features/groups/components/group-forms";
import { getGroupsForUser } from "@/features/groups/server/get-groups";
import getReadingProgress from "@/features/reading-progress/server/get-reading-progress";
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

    const [preferences, readingProgress, groups, params] = await Promise.all([
        getPreferences(),
        getReadingProgress(),
        getGroupsForUser(session.user.id),
        searchParams,
    ]);
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
            <div className="mx-auto max-w-5xl px-4 sm:px-6">
                <StickyAppHeader
                    navigation
                    className="-mx-4 px-4 sm:-mx-6 sm:px-6"
                >
                    <Link
                        href="/"
                        className="flex items-center gap-3 rounded-lg outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                            <UsersRound aria-hidden="true" className="size-5" />
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

                <section className="py-8 sm:py-14">
                    <div className="max-w-2xl">
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

                    {groups.length > 0 ? (
                        <div className="mt-8 divide-y divide-border/55 overflow-hidden rounded-3xl border border-border/60 bg-card/45 shadow-sm sm:mt-10">
                            {groups.map((group) => (
                                <article
                                    key={group.id}
                                    className="group grid grid-cols-[2.75rem_minmax(0,1fr)] items-start gap-x-3 gap-y-3 px-4 py-5 transition-colors hover:bg-muted/25 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:gap-5 sm:px-5 sm:py-6"
                                >
                                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                        <UsersRound
                                            aria-hidden="true"
                                            className="size-5"
                                        />
                                    </span>
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h2 className="text-lg font-semibold">
                                                {group.name}
                                            </h2>
                                            <span className="inline-flex items-center gap-1.5 rounded-full bg-background/60 px-3 py-1 text-xs text-muted-foreground ring-1 ring-border/50">
                                                {group.role ===
                                                    "supervisor" && (
                                                    <Shield className="size-3 text-primary" />
                                                )}
                                                {t(`role.${group.role}`)}
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
                                    <Button
                                        asChild
                                        variant="ghost"
                                        className="col-start-2 w-fit rounded-xl px-0 text-primary hover:bg-transparent hover:text-primary sm:col-start-auto sm:px-4"
                                    >
                                        <Link href={`/groups/${group.id}`}>
                                            {t("open")}
                                            <ArrowRight
                                                className={cn(
                                                    "size-4",
                                                    isArabic && "rotate-180",
                                                )}
                                            />
                                        </Link>
                                    </Button>
                                </article>
                            ))}
                        </div>
                    ) : (
                        <div className="mt-8 flex items-start gap-4 rounded-3xl border border-primary/12 bg-primary/[0.045] p-5 shadow-sm sm:mt-10 sm:p-6">
                            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                <UsersRound
                                    aria-hidden="true"
                                    className="size-5"
                                />
                            </span>
                            <div>
                                <h2 className="text-xl font-semibold">
                                    {t("emptyTitle")}
                                </h2>
                                <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
                                    {t("emptyDescription")}
                                </p>
                            </div>
                        </div>
                    )}

                    <GroupForms initialInviteCode={params.join ?? ""} />
                </section>
            </div>
        </main>
    );
}
