import { Sparkles } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createTranslator } from "next-intl";
import PageBackground from "@/components/page-background";
import StickyAppHeader from "@/components/sticky-app-header";
import UserMenu from "@/components/user-menu";
import { auth } from "@/features/auth/auth";
import MemorizationProgressMap from "@/features/memorization/components/memorization-progress-map";
import getMemorizationProgress from "@/features/memorization/server/get-memorization-progress";
import getReadingProgress from "@/features/reading-progress/server/get-reading-progress";
import getPreferences from "@/features/settings/server/get-preferences";
import { getMessages, getTextDirection } from "@/i18n/config";
import { cn } from "@/lib/utils";

export default async function MemorizationPage() {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) redirect("/sign-in");

    const [preferences, readingProgress, completedHizbs] = await Promise.all([
        getPreferences(),
        getReadingProgress(),
        getMemorizationProgress(session.user.id),
    ]);
    const messages = await getMessages(preferences.language);
    const t = createTranslator({
        locale: preferences.language,
        messages,
        namespace: "Memorization",
    });
    const homeT = createTranslator({
        locale: preferences.language,
        messages,
        namespace: "Home",
    });
    const isArabic = preferences.language === "ar";
    const readingNumber =
        preferences.readingMode === "page"
            ? (readingProgress.lastPageNumber ?? 1)
            : (readingProgress.lastSurahNumber ?? 1);
    const continueReadingHref = `/quran/${preferences.readingMode}/${readingNumber}`;
    const accountLabels = {
        openMenu: homeT("account.openMenu"),
        readingSpace: homeT("account.readingSpace"),
        switchToLight: homeT("account.switchToLight"),
        switchToDark: homeT("account.switchToDark"),
        continueReading: homeT("account.continueReading"),
        dashboard: homeT("account.dashboard"),
        profile: homeT("account.profile"),
        settings: homeT("account.settings"),
        signOut: homeT("account.signOut"),
    };

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
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
                <StickyAppHeader
                    navigation
                    className="-mx-4 px-4 sm:-mx-6 sm:px-6"
                >
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-3 rounded-md"
                    >
                        <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                            <Sparkles className="size-5" />
                        </span>
                        <span className="text-sm font-semibold tracking-wide">
                            {t("header")}
                        </span>
                    </Link>
                    <UserMenu
                        name={session.user.name}
                        image={session.user.image}
                        continueReadingHref={continueReadingHref}
                        labels={accountLabels}
                    />
                </StickyAppHeader>

                <section className="pb-12 pt-5 sm:pb-16 sm:pt-8">
                    <div className="border-b border-border/60 pb-6">
                        <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
                            {t("eyebrow")}
                        </p>
                        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                            {t("title")}
                        </h1>
                        <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
                            {t("description")}
                        </p>
                    </div>

                    <MemorizationProgressMap
                        initialCompletedHizbs={completedHizbs}
                    />
                </section>
            </div>
        </main>
    );
}
