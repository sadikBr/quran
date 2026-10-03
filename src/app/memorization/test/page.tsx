import { ArrowLeft, Shuffle } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createTranslator } from "next-intl";
import PageBackground from "@/components/page-background";
import PageHeading from "@/components/page-heading";
import StickyAppHeader from "@/components/sticky-app-header";
import { auth } from "@/features/auth/auth";
import RandomStartTest from "@/features/memorization/components/random-start-test";
import getMemorizationRecord from "@/features/memorization/server/get-memorization-record";
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
    const [messages, meta, chapters, navigation, record] = await Promise.all([
        getMessages(preferences.language),
        getSurahsMeta(),
        warsh ? getWarshChapters() : Promise.resolve(null),
        warsh ? getWarshNavigationMeta() : getQuranNavigationMeta(),
        getMemorizationRecord(session.user.id, preferences.riwayah),
    ]);
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
                <div className="pb-6 pt-5 sm:pt-8">
                    <Link
                        href="/memorization"
                        className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary"
                    >
                        <ArrowLeft
                            aria-hidden="true"
                            className="size-4 rtl:rotate-180"
                        />
                        {preferences.language === "ar"
                            ? "متابعة الحفظ"
                            : "Memorization progress"}
                    </Link>
                    <PageHeading
                        title={t("title")}
                        description={t("description")}
                        icon={<Shuffle />}
                    />
                </div>
                <RandomStartTest
                    key={`random-start:${session.user.id}:${preferences.riwayah}:${session.user.dataResetAt?.getTime() ?? "initial"}`}
                    storageKey={`random-start:${session.user.id}:${preferences.riwayah}${session.user.dataResetAt ? `:${session.user.dataResetAt.getTime()}` : ""}`}
                    surahs={surahs}
                    navigation={navigation}
                    locale={preferences.language}
                    memorizedAyahs={record.memorizedAyahs}
                />
            </div>
        </main>
    );
}
