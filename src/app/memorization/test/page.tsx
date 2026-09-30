import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createTranslator } from "next-intl";
import PageBackground from "@/components/page-background";
import StickyAppHeader from "@/components/sticky-app-header";
import { auth } from "@/features/auth/auth";
import RandomStartTest from "@/features/memorization/components/random-start-test";
import getMemorizationProgress from "@/features/memorization/server/get-memorization-progress";
import getQuranNavigationMeta from "@/features/quran/server/get-quran-navigation-meta";
import getSurahsMeta from "@/features/quran/server/get-surahs-meta";
import {
    getWarshChapters,
    getWarshNavigationMeta,
} from "@/features/quran/server/get-warsh-mushaf";
import getPreferences from "@/features/settings/server/get-preferences";
import { getMessages, getTextDirection } from "@/i18n/config";

export default async function RandomTestPage() {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) redirect("/sign-in");
    const preferences = await getPreferences();
    const warsh = preferences.riwayah === "warsh";
    const [messages, meta, chapters, navigation, completed] = await Promise.all(
        [
            getMessages(preferences.language),
            getSurahsMeta(),
            warsh ? getWarshChapters() : Promise.resolve(null),
            warsh ? getWarshNavigationMeta() : getQuranNavigationMeta(),
            getMemorizationProgress(session.user.id),
        ],
    );
    const t = createTranslator({
        locale: preferences.language,
        messages,
        namespace: "Memorization.test",
    });
    const surahs = meta.map((surah) => ({
        ...surah,
        numberOfAyahs:
            chapters?.find((chapter) => chapter.id === surah.number)?.verses
                .length ?? surah.numberOfAyahs,
    }));
    return (
        <main
            lang={preferences.language}
            dir={getTextDirection(preferences.language)}
            className={`relative isolate min-h-dvh bg-background ${preferences.language === "ar" ? "arabic-ui" : ""}`}
        >
            <PageBackground />
            <div className="app-container pb-12">
                <StickyAppHeader
                    navigation
                    className="-mx-4 px-4 sm:-mx-6 sm:px-6"
                />
                <div className="pt-6">
                    <h1 className="text-3xl font-semibold">{t("title")}</h1>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
                        {t("description")}
                    </p>
                </div>
                <RandomStartTest
                    key={`${session.user.id}:${preferences.riwayah}`}
                    storageKey={`random-start:${session.user.id}:${preferences.riwayah}`}
                    surahs={surahs}
                    navigation={navigation}
                    locale={preferences.language}
                    completedCount={completed.length}
                />
            </div>
        </main>
    );
}
