import { ArrowLeft, BookOpen } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createTranslator } from "next-intl";
import { auth } from "@/features/auth/auth";
import QuranAudioProvider from "@/features/quran/components/quran-audio-provider";
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
    if (!wird || wird.completed) redirect("/wird");

    const groups = await getWirdReaderData(wird, preferences);
    const t = createTranslator({
        locale: preferences.language,
        messages,
        namespace: "Wird.reader",
    });
    const isArabic = preferences.language === "ar";

    return (
        <main
            lang={preferences.language}
            dir={getTextDirection(preferences.language)}
            className={cn(
                "h-dvh overflow-y-auto bg-background",
                isArabic && "arabic-ui",
            )}
        >
            <header className="sticky top-0 z-30 border-border/60 border-b bg-background/90 backdrop-blur-md">
                <div className="mx-auto flex h-16 max-w-4xl items-center justify-between gap-4 px-4">
                    <Link
                        href="/wird"
                        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
                    >
                        <ArrowLeft
                            aria-hidden="true"
                            className={cn("size-4", isArabic && "rotate-180")}
                        />
                        <span className="hidden sm:inline">{t("back")}</span>
                    </Link>
                    <div className="flex items-center gap-2 text-sm font-semibold">
                        <BookOpen
                            aria-hidden="true"
                            className="size-4 text-primary"
                        />
                        {t("title")}
                    </div>
                </div>
            </header>

            <QuranAudioProvider>
                {groups.some((group) => group.ayahs.length > 0) ? (
                    <WirdReader
                        groups={groups}
                        startGlobalAyah={wird.start.globalAyahNumber}
                        endGlobalAyah={wird.end.globalAyahNumber}
                        initialProgress={wird.progressGlobalAyah}
                        showTranslation={preferences.showTranslation}
                        continuousRecitation={preferences.continuousRecitation}
                    />
                ) : (
                    <p className="mx-auto max-w-lg px-6 py-24 text-center text-muted-foreground">
                        {t("empty")}
                    </p>
                )}
            </QuranAudioProvider>
        </main>
    );
}
