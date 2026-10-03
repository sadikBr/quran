import { CalendarDays } from "lucide-react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createTranslator } from "next-intl";
import PageBackground from "@/components/page-background";
import PageHeading from "@/components/page-heading";
import StickyAppHeader from "@/components/sticky-app-header";
import { auth } from "@/features/auth/auth";
import WeeklyPlanner from "@/features/planning/components/weekly-planner";
import { getPlanningView } from "@/features/planning/server/service";
import getSurahsMeta from "@/features/quran/server/get-surahs-meta";
import getPreferences from "@/features/settings/server/get-preferences";
import { getMessages, getTextDirection } from "@/i18n/config";
import { cn } from "@/lib/utils";

export default async function WeeklyPage({
    searchParams,
}: {
    searchParams: Promise<{ week?: string }>;
}) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) redirect("/sign-in?returnTo=%2Fweekly");
    const [preferences, query, surahs] = await Promise.all([
        getPreferences(),
        searchParams,
        getSurahsMeta(),
    ]);
    const [messages, view] = await Promise.all([
        getMessages(preferences.language),
        getPlanningView(session.user.id, query.week),
    ]);
    const t = createTranslator({
        locale: preferences.language,
        messages,
        namespace: "Planning",
    });
    return (
        <main
            lang={preferences.language}
            dir={getTextDirection(preferences.language)}
            className={cn(
                "relative isolate min-h-dvh overflow-x-clip bg-background text-foreground",
                preferences.language === "ar" && "arabic-ui",
            )}
        >
            <PageBackground />
            <div className="app-container">
                <StickyAppHeader
                    navigation
                    className="-mx-4 px-4 sm:-mx-6 sm:px-6"
                />
                <div className="space-y-7 pb-8 pt-5 sm:pt-8">
                    <PageHeading
                        title={t("title")}
                        description={t("description")}
                        icon={<CalendarDays />}
                    />
                    <WeeklyPlanner
                        key={`${view.weekStart}:${view.version}`}
                        view={view}
                        surahs={surahs}
                    />
                </div>
            </div>
        </main>
    );
}
