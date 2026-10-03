import { CalendarDays } from "lucide-react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createTranslator } from "next-intl";
import PageBackground from "@/components/page-background";
import PageHeading from "@/components/page-heading";
import StickyAppHeader from "@/components/sticky-app-header";
import { auth } from "@/features/auth/auth";
import { isPlatformAdmin } from "@/features/auth/permissions";
import StudySchedule from "@/features/learning/components/study-schedule";
import WeeklyMemorization from "@/features/learning/components/weekly-memorization";
import { PlanNavigation } from "@/features/learning/components/weekly-plan-ui";
import {
    getLearningSchedule,
    getMemorizationPlanView,
} from "@/features/learning/server/service";
import getSurahsMeta from "@/features/quran/server/get-surahs-meta";
import getPreferences from "@/features/settings/server/get-preferences";
import { getMessages, getTextDirection } from "@/i18n/config";
import { cn } from "@/lib/utils";
export default async function MemorizationPlanPage() {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) redirect("/sign-in");
    if (await isPlatformAdmin(session.user.id)) redirect("/admin");
    const preferences = await getPreferences();
    const [view, surahs, messages, schedule] = await Promise.all([
        getMemorizationPlanView(session.user.id, preferences.riwayah),
        getSurahsMeta(),
        getMessages(preferences.language),
        getLearningSchedule(session.user.id),
    ]);
    const t = createTranslator({
        locale: preferences.language,
        messages,
        namespace: "Memorization.learning",
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
                <section className="pb-12 pt-5 sm:pt-8">
                    <PageHeading
                        title={t("title")}
                        description={t("intro")}
                        icon={<CalendarDays />}
                    />
                    <PlanNavigation active="memorization" />
                    <StudySchedule schedule={schedule} />
                    <WeeklyMemorization
                        memorizationDays={schedule.memorizationDays}
                        view={view}
                        defaultTimezone={preferences.adhkarTimezone}
                        defaultRiwayah={preferences.riwayah}
                        surahs={surahs.map((s) => ({
                            number: s.number,
                            name: s.name,
                            englishName: s.englishName,
                        }))}
                    />
                </section>
            </div>
        </main>
    );
}
