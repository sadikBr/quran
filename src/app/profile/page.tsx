import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createTranslator } from "next-intl";
import PageBackground from "@/components/page-background";
import ProfileForm from "@/components/profile-form";
import StickyAppHeader from "@/components/sticky-app-header";
import db from "@/drizzle/db";
import { groupMember } from "@/drizzle/schema";
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
    const canDeleteAccount =
        !(await isPlatformAdmin(session.user.id)) && !supervised;

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
                    <p className="text-xs font-semibold tracking-[0.2em] text-primary">
                        {t("page.eyebrow")}
                    </p>
                    <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                        {t("page.title")}
                    </h1>
                    <p className="mt-3 max-w-xl text-sm leading-7 text-muted-foreground">
                        {t("page.description")}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-border/60 pb-6 text-xs text-muted-foreground">
                        <span>
                            {t("page.memberSince", { date: memberSince })}
                        </span>
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
                        canDeleteAccount={canDeleteAccount}
                        initialName={session.user.name}
                        initialImage={session.user.image ?? null}
                        initialEmail={session.user.email}
                        currentSessionToken={session.session.token}
                    />
                </section>
            </div>
        </main>
    );
}
