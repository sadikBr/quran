import { Shuffle, Sparkles } from "lucide-react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createTranslator } from "next-intl";
import ActionCard from "@/components/action-card";
import PageBackground from "@/components/page-background";
import PageHeading from "@/components/page-heading";
import StickyAppHeader from "@/components/sticky-app-header";
import { auth } from "@/features/auth/auth";
import MemorizationProgressMap from "@/features/memorization/components/memorization-progress-map";
import getMemorizationProgress from "@/features/memorization/server/get-memorization-progress";
import getPreferences from "@/features/settings/server/get-preferences";
import { getMessages, getTextDirection } from "@/i18n/config";
import { cn } from "@/lib/utils";

export default async function MemorizationPage() {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) redirect("/sign-in");

    const [preferences, completedHizbs] = await Promise.all([
        getPreferences(),
        getMemorizationProgress(session.user.id),
    ]);
    const messages = await getMessages(preferences.language);
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
            <div className="app-container ">
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

                    <ActionCard
                        href="/memorization/test"
                        className="mt-6"
                        icon={<Shuffle />}
                        title={t("test.title")}
                        description={t("test.description")}
                    />
                    <MemorizationProgressMap
                        initialCompletedHizbs={completedHizbs}
                    />
                </section>
            </div>
        </main>
    );
}
