import { and, eq } from "drizzle-orm";
import { UserRound } from "lucide-react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createTranslator } from "next-intl";
import PageBackground from "@/components/page-background";
import PageHeading from "@/components/page-heading";
import ProfileForm from "@/components/profile-form";
import StickyAppHeader from "@/components/sticky-app-header";
import db from "@/drizzle/db";
import { groupMember } from "@/drizzle/schema";
import AdminWorkspace from "@/features/admin/components/admin-workspace";
import { auth } from "@/features/auth/auth";
import { isPlatformAdmin } from "@/features/auth/permissions";
import getPreferences from "@/features/settings/server/get-preferences";
import { getMessages, getTextDirection } from "@/i18n/config";
import { cn } from "@/lib/utils";

export default async function ProfilePage() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        redirect("/sign-in");
    }
    const [supervised] = await db
        .select({ id: groupMember.id })
        .from(groupMember)
        .where(
            and(
                eq(groupMember.userId, session.user.id),
                eq(groupMember.role, "supervisor"),
            ),
        )
        .limit(1);
    const isAdmin = await isPlatformAdmin(session.user.id);
    const canDeleteAccount = !isAdmin && !supervised;

    const [preferences] = await Promise.all([getPreferences()]);
    const messages = await getMessages(preferences.language);
    const t = createTranslator({
        locale: preferences.language,
        messages,
        namespace: "Profile",
    });
    const memberSince = new Intl.DateTimeFormat(preferences.language, {
        month: "long",
        year: "numeric",
    }).format(session.user.createdAt);

    const content = (
        <>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 pb-2 text-xs text-muted-foreground">
                <span>{t("page.memberSince", { date: memberSince })}</span>
                <span
                    className={
                        session.user.emailVerified
                            ? "text-primary"
                            : "text-amber-600 dark:text-amber-400"
                    }
                >
                    {session.user.emailVerified
                        ? t("page.emailVerified")
                        : t("page.emailNotVerified")}
                </span>
            </div>
            <ProfileForm
                className={
                    isAdmin
                        ? "gap-6 [&_form_button]:min-h-11 [&_[data-slot=input]]:bg-background/50"
                        : undefined
                }
                canDeleteAccount={canDeleteAccount}
                initialName={session.user.name}
                initialImage={session.user.image ?? null}
                initialEmail={session.user.email}
                currentSessionToken={session.session.token}
            />
        </>
    );
    if (isAdmin)
        return (
            <AdminWorkspace
                language={preferences.language}
                title={t("page.title")}
                description={t("page.description")}
            >
                <div className="min-w-0 [&>div:first-child]:mt-0">
                    {content}
                </div>
            </AdminWorkspace>
        );

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
                        title={t("page.title")}
                        description={t("page.description")}
                        icon={<UserRound />}
                    />
                    {content}
                </section>
            </div>
        </main>
    );
}
