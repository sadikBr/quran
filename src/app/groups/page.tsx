import { ArrowLeft, ArrowRight, Shield, UsersRound } from "lucide-react";
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
            <div className="mx-auto max-w-5xl px-4">
                <StickyAppHeader className="-mx-4 px-4">
                    <Link
                        href="/"
                        className="flex items-center gap-3 rounded-md"
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

                <section className="py-10 sm:py-14">
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
                    >
                        <ArrowLeft
                            aria-hidden="true"
                            className={cn("size-4", isArabic && "rotate-180")}
                        />
                        {t("back")}
                    </Link>
                    <div className="mt-9 max-w-2xl">
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
                        <div className="mt-10 divide-y divide-border/60 border-border/60 border-y">
                            {groups.map((group) => (
                                <article
                                    key={group.id}
                                    className="group grid gap-5 px-2 py-6 transition-colors hover:bg-muted/20 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:px-3"
                                >
                                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                        <UsersRound className="size-5" />
                                    </span>
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h2 className="text-lg font-semibold">
                                                {group.name}
                                            </h2>
                                            <span className="inline-flex items-center gap-1.5 rounded-full bg-background/60 px-3 py-1 text-xs text-muted-foreground ring-1 ring-border/50">
                                                {group.role === "admin" && (
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
                                        className="w-fit rounded-full text-primary hover:text-primary"
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
                        <div className="mt-10 flex items-start gap-4 border-primary/15 border-t pt-6">
                            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                <UsersRound className="size-5" />
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
