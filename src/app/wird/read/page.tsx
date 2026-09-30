import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createTranslator } from "next-intl";
import AppLogo from "@/components/app-logo";
import AppPrimaryNav from "@/components/app-primary-nav";
import { auth } from "@/features/auth/auth";
import getPreferences from "@/features/settings/server/get-preferences";
import WirdReader from "@/features/wird/components/wird-reader";
import getDailyWird from "@/features/wird/server/get-daily-wird";
import getWirdReaderData from "@/features/wird/server/get-wird-reader-data";
import { getMessages, getTextDirection } from "@/i18n/config";
import { cn } from "@/lib/utils";

export default async function WirdReaderPage() {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) redirect("/sign-in");

    const preferences = await getPreferences();
    const [messages, wird] = await Promise.all([
        getMessages(preferences.language),
        getDailyWird(session.user.id, preferences.arabicEdition),
    ]);
    if (!wird || wird.completed || wird.scheduledForFuture) redirect("/wird");

    const groups = await getWirdReaderData(wird, preferences);
    const t = createTranslator({
        locale: preferences.language,
        messages,
        namespace: "Wird.reader",
    });
    const isArabic = preferences.language === "ar";

    return (
        <main
            data-wird-scroll-container
            lang={preferences.language}
            dir={getTextDirection(preferences.language)}
            className={cn(
                "quran-reading-surface h-dvh overflow-y-auto bg-background",
                isArabic && "arabic-ui",
            )}
        >
            <header className="sticky top-0 z-30 bg-background/92 backdrop-blur-xl">
                <div className="app-container flex h-[calc(4rem+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] sm:h-[calc(5rem+env(safe-area-inset-top))] items-center justify-between gap-4">
                    <AppPrimaryNav />
                    <AppLogo />
                </div>
            </header>

            {groups.some((group) => group.ayahs.length > 0) ? (
                <WirdReader
                    groups={groups}
                    startGlobalAyah={wird.start.globalAyahNumber}
                    endGlobalAyah={wird.end.globalAyahNumber}
                    initialProgress={wird.progressGlobalAyah}
                    initialPosition={wird.progressVerse}
                    initialRevision={wird.revision ?? ""}
                    targetDate={wird.targetDate}
                    draftKey={`quran:wird-draft:v1:${session.user.id}:${wird.targetDate}:${wird.start.globalAyahNumber}:${wird.end.globalAyahNumber}:${preferences.riwayah}`}
                    riwayah={preferences.riwayah}
                    showTranslation={preferences.showTranslation}
                    continuousRecitation={preferences.continuousRecitation}
                />
            ) : (
                <p className="mx-auto max-w-lg px-6 py-24 text-center text-muted-foreground">
                    {t("empty")}
                </p>
            )}
        </main>
    );
}
