import { ArrowLeft, BookOpen } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createTranslator } from "next-intl";
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
                <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-4 px-3 sm:px-5">
                    <Link
                        href="/wird"
                        className="group inline-flex items-center gap-2 whitespace-nowrap rounded-full px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground sm:text-sm"
                    >
                        <ArrowLeft
                            aria-hidden="true"
                            className={cn(
                                "size-3.5 transition-transform group-hover:-translate-x-0.5 rtl:group-hover:translate-x-0.5",
                                isArabic && "rotate-180",
                            )}
                        />
                        <span>{t("back")}</span>
                    </Link>
                    <div className="flex items-center gap-2 text-sm font-semibold">
                        <BookOpen
                            aria-hidden="true"
                            className="size-4 text-primary"
                        />
                        <span>{t("title")}</span>
                    </div>
                </div>
            </header>

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
        </main>
    );
}
