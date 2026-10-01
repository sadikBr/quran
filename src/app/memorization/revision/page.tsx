import { CalendarDays } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createTranslator } from "next-intl";
import PageBackground from "@/components/page-background";
import PageHeading from "@/components/page-heading";
import StickyAppHeader from "@/components/sticky-app-header";
import { Button } from "@/components/ui/button";
import { auth } from "@/features/auth/auth";
import { isPlatformAdmin } from "@/features/auth/permissions";
import getSurahsMeta from "@/features/quran/server/get-surahs-meta";
import WeeklyRevision from "@/features/revision/components/weekly-revision";
import { getRevisionView } from "@/features/revision/server/service";
import getPreferences from "@/features/settings/server/get-preferences";
import { getMessages, getTextDirection } from "@/i18n/config";
import { cn } from "@/lib/utils";
export default async function RevisionPage() {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) redirect("/sign-in");
    if (await isPlatformAdmin(session.user.id)) redirect("/admin");
    const preferences = await getPreferences();
    const [view, surahs, messages] = await Promise.all([
        getRevisionView(session.user.id, preferences.riwayah),
        getSurahsMeta(),
        getMessages(preferences.language),
    ]);
    const t = createTranslator({
        locale: preferences.language,
        messages,
        namespace: "Memorization.weekly",
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
                    <Button asChild variant="outline" className="mt-5">
                        <Link href="/memorization">{t("map")}</Link>
                    </Button>
                    <WeeklyRevision
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
