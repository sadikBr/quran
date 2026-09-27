import {
    ArrowLeft,
    BookOpen,
    CalendarCheck,
    Check,
    Clock3,
} from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createTranslator } from "next-intl";
import PageBackground from "@/components/page-background";
import StickyAppHeader from "@/components/sticky-app-header";
import { Button } from "@/components/ui/button";
import UserMenu from "@/components/user-menu";
import { auth } from "@/features/auth/auth";
import getReadingProgress from "@/features/reading-progress/server/get-reading-progress";
import getPreferences from "@/features/settings/server/get-preferences";
import CompleteWirdButton from "@/features/wird/components/complete-wird-button";
import WirdPreferenceForm from "@/features/wird/components/wird-preference-form";
import getDailyWird from "@/features/wird/server/get-daily-wird";
import { getMessages, getTextDirection } from "@/i18n/config";
import { cn } from "@/lib/utils";

export default async function WirdPage() {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) redirect("/sign-in");

    const [preferences, readingProgress] = await Promise.all([
        getPreferences(),
        getReadingProgress(),
    ]);
    const [messages, wird] = await Promise.all([
        getMessages(preferences.language),
        getDailyWird(session.user.id, preferences.arabicEdition),
    ]);
    const t = createTranslator({
        locale: preferences.language,
        messages,
        namespace: "Wird",
    });
    const homeT = createTranslator({
        locale: preferences.language,
        messages,
        namespace: "Home",
    });
    const savedNumber =
        preferences.readingMode === "page"
            ? readingProgress.lastPageNumber
            : readingProgress.lastSurahNumber;
    const continueReadingHref = `/quran/${preferences.readingMode}/${savedNumber ?? 1}`;
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
    const isArabic = preferences.language === "ar";
    const startName = isArabic
        ? wird?.start.surahName
        : wird?.start.englishSurahName;
    const endName = isArabic ? wird?.end.surahName : wird?.end.englishSurahName;
    const range =
        wird && startName && endName
            ? wird.start.surahNumber === wird.end.surahNumber
                ? t("today.sameSurah", {
                      surah: startName,
                      start: wird.start.ayahNumber,
                      end: wird.end.ayahNumber,
                  })
                : t("today.acrossSurahs", {
                      startSurah: startName,
                      startAyah: wird.start.ayahNumber,
                      endSurah: endName,
                      endAyah: wird.end.ayahNumber,
                  })
            : "";
    const pages = wird
        ? wird.start.pageNumber === wird.end.pageNumber
            ? t("today.singlePage", { page: wird.start.pageNumber })
            : t("today.pages", {
                  start: wird.start.pageNumber,
                  end: wird.end.pageNumber,
              })
        : "";
    const startReadingHref = "/wird/read";

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
            <div className="mx-auto max-w-5xl px-4">
                <StickyAppHeader className="-mx-4 px-4">
                    <Link
                        href="/"
                        className="group flex items-center gap-3 rounded-md outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                            <BookOpen aria-hidden="true" className="size-5" />
                        </span>
                        <span className="text-sm font-semibold tracking-wide">
                            {homeT("brand")}
                        </span>
                    </Link>
                    <UserMenu
                        name={session.user.name}
                        image={session.user.image}
                        continueReadingHref={continueReadingHref}
                        labels={accountLabels}
                    />
                </StickyAppHeader>

                <section className="py-10 sm:py-14">
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
                    >
                        <ArrowLeft
                            aria-hidden="true"
                            className={cn("size-4", isArabic && "rotate-180")}
                        />
                        {t("navigation.back")}
                    </Link>
                    <div className="mt-9 max-w-2xl">
                        <p className="text-xs font-semibold tracking-[0.18em] text-primary">
                            {t("eyebrow")}
                        </p>
                        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                            {t("title")}
                        </h1>
                        <p className="mt-4 leading-7 text-muted-foreground">
                            {t("description")}
                        </p>
                    </div>

                    {!wird ? (
                        <section className="mt-10 max-w-2xl bg-muted/45 px-5 py-6 sm:px-7 sm:py-8">
                            <h2 className="text-xl font-semibold">
                                {t("setup.title")}
                            </h2>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                {t("setup.description")}
                            </p>
                            <WirdPreferenceForm />
                        </section>
                    ) : (
                        <>
                            <section className="relative mt-10 overflow-hidden bg-muted/45 px-5 py-7 sm:px-8 sm:py-9">
                                <div className="absolute inset-y-0 start-0 w-1 bg-primary" />
                                <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="max-w-2xl">
                                        <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.16em] text-primary uppercase">
                                            <CalendarCheck
                                                aria-hidden="true"
                                                className="size-4"
                                            />
                                            {t("today.eyebrow")}
                                        </div>
                                        <p className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
                                            {t("today.goal", {
                                                amount: wird.amount,
                                                unit: t(`units.${wird.unit}`),
                                            })}
                                        </p>
                                        <h2 className="mt-5 text-xl font-semibold leading-8 sm:text-2xl">
                                            {range}
                                        </h2>
                                        <p className="mt-2 text-sm text-muted-foreground">
                                            {pages}
                                        </p>
                                    </div>
                                    <span
                                        className={cn(
                                            "inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold",
                                            wird.completed
                                                ? "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400"
                                                : wird.carriedOver
                                                  ? "bg-amber-500/12 text-amber-600 dark:text-amber-400"
                                                  : "bg-primary/10 text-primary",
                                        )}
                                    >
                                        {wird.completed ? (
                                            <Check
                                                aria-hidden="true"
                                                className="size-3.5"
                                            />
                                        ) : (
                                            <Clock3
                                                aria-hidden="true"
                                                className="size-3.5"
                                            />
                                        )}
                                        {t(
                                            wird.completed
                                                ? "today.completed"
                                                : wird.carriedOver
                                                  ? "today.carriedOver"
                                                  : "today.ready",
                                        )}
                                    </span>
                                </div>
                                <p className="mt-7 max-w-2xl text-sm leading-6 text-muted-foreground">
                                    {t(
                                        wird.completed
                                            ? "today.completedDescription"
                                            : wird.carriedOver
                                              ? "today.carriedOverDescription"
                                              : "today.readyDescription",
                                    )}
                                </p>
                                {!wird.completed && (
                                    <div className="mt-6 flex flex-wrap gap-3">
                                        <Button asChild>
                                            <Link href={startReadingHref}>
                                                <BookOpen
                                                    aria-hidden="true"
                                                    className="size-4"
                                                />
                                                {t(
                                                    wird.progressGlobalAyah
                                                        ? "today.continueReading"
                                                        : "today.startReading",
                                                )}
                                            </Link>
                                        </Button>
                                        <CompleteWirdButton />
                                    </div>
                                )}
                            </section>

                            <details className="mt-10 max-w-2xl group">
                                <summary className="cursor-pointer list-none text-sm font-semibold text-muted-foreground transition-colors hover:text-primary">
                                    {t("today.changeGoal")}
                                </summary>
                                <div className="mt-5 bg-muted/35 px-5 py-6 sm:px-7">
                                    <WirdPreferenceForm
                                        compact
                                        initialUnit={wird.unit}
                                        initialAmount={wird.amount}
                                    />
                                </div>
                            </details>
                        </>
                    )}
                </section>
            </div>
        </main>
    );
}
