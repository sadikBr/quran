import { Sparkles } from "lucide-react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createTranslator } from "next-intl";
import PageBackground from "@/components/page-background";
import PageHeading from "@/components/page-heading";
import StickyAppHeader from "@/components/sticky-app-header";
import { auth } from "@/features/auth/auth";
import { getMemorizationPlanView } from "@/features/learning/server/service";
import MemorizationProgressMap from "@/features/memorization/components/memorization-progress-map";
import getMemorizationRecord from "@/features/memorization/server/get-memorization-record";
import getSurahsMeta from "@/features/quran/server/get-surahs-meta";
import getPreferences from "@/features/settings/server/get-preferences";
import { getMessages, getTextDirection } from "@/i18n/config";
import { cn } from "@/lib/utils";

export default async function MemorizationPage() {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) redirect("/sign-in");

    const preferences = await getPreferences();
    const plan = await getMemorizationPlanView(
        session.user.id,
        preferences.riwayah,
    );
    const record = await getMemorizationRecord(
        session.user.id,
        preferences.riwayah,
        plan.plan?.enabled && plan.week
            ? plan.sessions
                  .filter((s) => !s.done)
                  .flatMap((s) =>
                      s.scheduledDate
                          ? [
                                {
                                    ...s,
                                    scheduledDate: s.scheduledDate,
                                    riwayah:
                                        plan.week?.riwayah ??
                                        preferences.riwayah,
                                },
                            ]
                          : [],
                  )
            : [],
    );
    const [messages, surahs] = await Promise.all([
        getMessages(preferences.language),
        getSurahsMeta(),
    ]);
    const t = createTranslator({
        locale: preferences.language,
        messages,
        namespace: "Memorization",
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
            <div className="app-container">
                <StickyAppHeader
                    navigation
                    className="-mx-4 px-4 sm:-mx-6 sm:px-6"
                />

                <section className="pb-12 pt-5 sm:pb-16 sm:pt-8">
                    <PageHeading
                        title={t("title")}
                        description={t("description")}
                        icon={<Sparkles />}
                    />

                    <MemorizationProgressMap
                        record={record}
                        surahs={surahs.map((s) => ({
                            number: s.number,
                            name: s.name,
                            englishName: s.englishName,
                            numberOfAyahs:
                                record.baselineSurahCounts[s.number - 1],
                        }))}
                    />
                </section>
            </div>
        </main>
    );
}
