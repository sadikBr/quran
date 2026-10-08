import { CalendarDays } from "lucide-react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createTranslator } from "next-intl";
import PageBackground from "@/components/page-background";
import PageHeading from "@/components/page-heading";
import StickyAppHeader from "@/components/sticky-app-header";
import { auth } from "@/features/auth/auth";
import { isPlatformAdmin } from "@/features/auth/permissions";
import PlansNavigation from "@/features/plans/components/plans-navigation";
import getPreferences from "@/features/settings/server/get-preferences";
import { getMessages, getTextDirection } from "@/i18n/config";
import { cn } from "@/lib/utils";

export default async function PlansLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) redirect("/sign-in?returnTo=%2Fplans");
    if (await isPlatformAdmin(session.user.id)) redirect("/admin");
    const preferences = await getPreferences();
    const t = createTranslator({
        locale: preferences.language,
        messages: await getMessages(preferences.language),
        namespace: "Plans",
    });
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
            <div className="app-container">
                <StickyAppHeader
                    navigation
                    className="-mx-4 px-4 sm:-mx-6 sm:px-6"
                />
                <div className="space-y-7 pb-12 pt-5 sm:pt-8">
                    <PageHeading
                        title={t("title")}
                        description={t("description")}
                        icon={<CalendarDays />}
                    />
                    <PlansNavigation />
                    {children}
                </div>
            </div>
        </main>
    );
}
