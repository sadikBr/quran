import {
    ArrowRight,
    BookMarked,
    BookOpen,
    ChartNoAxesCombined,
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
import getKhatmahPlan from "@/features/khatmah/server/get-khatmah-plan";
import getPracticeAssignment from "@/features/practice/server/get-practice-assignment";
import QuranAudioProvider from "@/features/quran/components/quran-audio-provider";
import getQuranNavigationMeta from "@/features/quran/server/get-quran-navigation-meta";
import getSurahsMeta from "@/features/quran/server/get-surahs-meta";
import { getWarshChapters } from "@/features/quran/server/get-warsh-mushaf";
import getReadingProgress from "@/features/reading-progress/server/get-reading-progress";
import SavedAyahsSection from "@/features/saved-ayahs/components/saved-ayahs-section";
import getSavedAyahs from "@/features/saved-ayahs/server/get-saved-ayahs";
import getPreferences from "@/features/settings/server/get-preferences";
import WirdDashboardCard from "@/features/wird/components/wird-dashboard-card";
import getDailyWird from "@/features/wird/server/get-daily-wird";
import getWirdHistory from "@/features/wird/server/get-wird-history";
import { getMessages, getTextDirection } from "@/i18n/config";
import { cn } from "@/lib/utils";

const upcomingFeatures = [
    {
        icon: ChartNoAxesCombined,
        key: "progressInsights" as const,
    },
];

export default async function DashboardPage() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        redirect("/sign-in");
    }

    const [preferences, readingProgress, savedAyahs, surahs, hafsNavigation] =
        await Promise.all([
            getPreferences(),
            getReadingProgress(),
            getSavedAyahs(session.user.id),
            getSurahsMeta().catch(() => []),
            getQuranNavigationMeta().catch(() => null),
        ]);
    const [dailyWird, wirdHistory, khatmahPlan, practiceAssignment] =
        await Promise.all([
            getDailyWird(session.user.id, preferences.arabicEdition),
            getWirdHistory(session.user.id),
            getKhatmahPlan(session.user.id),
            getPracticeAssignment(session.user.id),
        ]);
    const warshChapters =
        preferences.riwayah === "warsh" ? await getWarshChapters() : [];
    const warshBySurah = new Map(
        warshChapters.map((chapter) => [chapter.id, chapter]),
    );
    const surahOffsets = new Map<number, number>();
    let ayahOffset = 0;
    for (const surah of surahs) {
        surahOffsets.set(surah.number, ayahOffset);
        ayahOffset += surah.numberOfAyahs;
    }
    const hafsPageForAyah = (
        globalAyahNumber: number,
        fallbackPageNumber: number,
    ) => {
        if (!hafsNavigation) return fallbackPageNumber;

        let pageNumber = 1;

        for (const page of hafsNavigation.pages) {
            if (page.globalAyahNumber > globalAyahNumber) break;
            pageNumber = page.number;
        }

        return pageNumber;
    };
    const messages = await getMessages(preferences.language);
    const t = createTranslator({
        locale: preferences.language,
        messages,
        namespace: "Dashboard",
    });
    const homeT = createTranslator({
        locale: preferences.language,
        messages,
        namespace: "Home",
    });
    const wirdT = createTranslator({
        locale: preferences.language,
        messages,
        namespace: "Wird",
    });
    const practiceT = createTranslator({
        locale: preferences.language,
        messages,
        namespace: "Practice",
    });
    const savedNumber =
        preferences.readingMode === "page"
            ? readingProgress.lastPageNumber
            : readingProgress.lastSurahNumber;
    const currentNumber = savedNumber ?? 1;
    const readingLabel = t(
        preferences.readingMode === "page" ? "reading.page" : "reading.surah",
    );
    const continueReadingHref = `/quran/${preferences.readingMode}/${currentNumber}`;
    let readingHeading = t("reading.beginWith", {
        type: readingLabel,
        number: currentNumber,
    });

    if (savedNumber !== null) {
        readingHeading = t("reading.continueFrom", {
            type: readingLabel,
            number: currentNumber,
        });

        if (preferences.readingMode === "surah") {
            const surah = surahs.find((item) => item.number === savedNumber);
            const surahName = surah
                ? preferences.language === "ar"
                    ? surah.name
                    : surah.englishName
                : undefined;

            readingHeading = surahName
                ? t("reading.continueWith", { surah: surahName })
                : t("reading.continueGeneric");
        }
    }

    const localizedSavedAyahs = savedAyahs.map((ayah) => {
        const surah = surahs.find((item) => item.number === ayah.surahNumber);
        const hafsAyahNumber =
            ayah.globalAyahNumber - (surahOffsets.get(ayah.surahNumber) ?? 0);
        const warshChapter = warshBySurah.get(ayah.surahNumber);
        const exactWarshVerse = warshChapter?.verses.find(
            (verse) =>
                verse.number === ayah.ayahNumber &&
                verse.number_in_hafs.includes(hafsAyahNumber),
        );
        const warshVerse =
            exactWarshVerse ??
            warshChapter?.verses.find((verse) =>
                verse.number_in_hafs.includes(hafsAyahNumber),
            );

        return {
            ...ayah,
            ayahNumber: warshVerse?.number ?? hafsAyahNumber,
            pageNumber:
                warshVerse?.page_number ??
                hafsPageForAyah(ayah.globalAyahNumber, ayah.pageNumber),
            arabicText: warshVerse?.text ?? ayah.arabicText,
            surahName:
                preferences.language === "ar"
                    ? (surah?.name ?? ayah.surahName)
                    : (surah?.englishName ?? ayah.surahName),
        };
    });
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
                preferences.language === "ar" && "arabic-ui",
            )}
        >
            <PageBackground />
            <div className="mx-auto max-w-5xl px-4">
                <StickyAppHeader className="-mx-4 px-4">
                    <Link
                        href="/"
                        className="group flex items-center gap-3 rounded-md outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-transform group-hover:-rotate-3">
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
                    <div>
                        <p className="text-sm font-semibold tracking-[0.18em] text-primary">
                            {t("eyebrow")}
                        </p>
                        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                            {t("welcome", { name: session.user.name })}
                        </h1>
                        <p className="mt-4 max-w-2xl leading-7 text-muted-foreground">
                            {t("introduction")}
                        </p>
                    </div>

                    <section className="relative mt-10 overflow-hidden rounded-3xl bg-gradient-to-br from-muted/70 via-muted/40 to-transparent px-5 py-6 ring-1 ring-primary/10 sm:px-7 sm:py-7">
                        <div
                            aria-hidden="true"
                            className="pointer-events-none absolute -top-24 -start-20 size-52 rounded-full bg-primary/[0.06] blur-3xl"
                        />
                        <div className="relative grid items-center gap-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-8">
                            <div className="flex min-w-0 flex-col items-center gap-3 text-center sm:flex-row sm:items-start sm:gap-4 sm:text-start">
                                <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm shadow-primary/20 sm:size-11 sm:rounded-full">
                                    <BookOpen
                                        aria-hidden="true"
                                        className="size-5"
                                    />
                                </span>
                                <div className="min-w-0">
                                    <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">
                                        {t("reading.eyebrow")}
                                    </p>
                                    <h2 className="mt-1.5 text-xl font-semibold tracking-tight sm:text-2xl">
                                        {readingHeading}
                                    </h2>
                                    <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                                        {savedNumber
                                            ? t("reading.resumeDescription")
                                            : t("reading.startDescription")}
                                    </p>
                                </div>
                            </div>
                            <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:shrink-0 sm:gap-3">
                                <Button
                                    asChild
                                    className="min-h-11 w-full rounded-xl px-3 shadow-sm shadow-primary/15 sm:w-auto sm:px-4"
                                >
                                    <Link href={continueReadingHref}>
                                        {savedNumber
                                            ? t("reading.continueReading")
                                            : t("reading.startReading")}
                                        <ArrowRight
                                            aria-hidden="true"
                                            className={cn(
                                                preferences.language === "ar" &&
                                                    "rotate-180",
                                            )}
                                        />
                                    </Link>
                                </Button>
                                <Button
                                    asChild
                                    variant="ghost"
                                    className="min-h-11 w-full rounded-xl px-3 sm:w-auto sm:px-4"
                                >
                                    <Link href="/quran">
                                        {t("reading.browseSurahs")}
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </section>

                    <section className="relative mt-8 overflow-hidden rounded-3xl bg-primary/[0.06] px-5 py-6 ring-1 ring-primary/12 sm:px-7">
                        <div className="grid items-center gap-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-8">
                            <div className="flex min-w-0 items-start gap-4">
                                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                                    <BookMarked
                                        aria-hidden="true"
                                        className="size-5"
                                    />
                                </span>
                                <div className="min-w-0">
                                    <p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">
                                        {practiceT("dashboard.eyebrow")}
                                    </p>
                                    <h2 className="mt-1.5 text-lg font-semibold tracking-tight sm:text-xl">
                                        {practiceAssignment
                                            ? practiceT(
                                                  `kinds.${practiceAssignment.kind}`,
                                              )
                                            : practiceT("dashboard.emptyTitle")}
                                    </h2>
                                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                        {practiceAssignment
                                            ? practiceT("range", {
                                                  startSurah:
                                                      surahs.find(
                                                          (surah) =>
                                                              surah.number ===
                                                              practiceAssignment
                                                                  .start
                                                                  .surahNumber,
                                                      )?.[
                                                          preferences.language ===
                                                          "ar"
                                                              ? "name"
                                                              : "englishName"
                                                      ] ?? "",
                                                  startAyah:
                                                      practiceAssignment.start
                                                          .ayahNumber,
                                                  endSurah:
                                                      surahs.find(
                                                          (surah) =>
                                                              surah.number ===
                                                              practiceAssignment
                                                                  .end
                                                                  .surahNumber,
                                                      )?.[
                                                          preferences.language ===
                                                          "ar"
                                                              ? "name"
                                                              : "englishName"
                                                      ] ?? "",
                                                  endAyah:
                                                      practiceAssignment.end
                                                          .ayahNumber,
                                              })
                                            : practiceT(
                                                  "dashboard.emptyDescription",
                                              )}
                                    </p>
                                </div>
                            </div>
                            <Button
                                asChild
                                variant={
                                    practiceAssignment ? "default" : "outline"
                                }
                                className="w-full rounded-xl sm:w-auto"
                            >
                                <Link href={"/practice"}>
                                    {practiceT(
                                        practiceAssignment
                                            ? "dashboard.open"
                                            : "dashboard.setup",
                                    )}
                                    <ArrowRight
                                        aria-hidden="true"
                                        className={cn(
                                            "size-4",
                                            preferences.language === "ar" &&
                                                "rotate-180",
                                        )}
                                    />
                                </Link>
                            </Button>
                        </div>
                    </section>

                    <WirdDashboardCard
                        wird={dailyWird}
                        history={wirdHistory}
                        khatmahProgress={
                            khatmahPlan ? khatmahPlan.progressPercentage : null
                        }
                        isArabic={preferences.language === "ar"}
                        labels={{
                            eyebrow: wirdT("dashboard.eyebrow"),
                            emptyTitle: wirdT("dashboard.emptyTitle"),
                            emptyDescription: wirdT(
                                "dashboard.emptyDescription",
                            ),
                            setup: wirdT("dashboard.setup"),
                            open: wirdT("dashboard.open"),
                            completed: wirdT("dashboard.completed"),
                            pending: wirdT("dashboard.pending"),
                            restDay: wirdT("dashboard.restDay"),
                            khatmahProgress: wirdT("dashboard.khatmahProgress"),
                            streak: wirdT("dashboard.streak", {
                                count: wirdHistory.currentStreak,
                            }),
                            goal: dailyWird
                                ? wirdT("today.goal", {
                                      amount: dailyWird.amount,
                                      unit: wirdT(`units.${dailyWird.unit}`),
                                  })
                                : undefined,
                        }}
                    />

                    <QuranAudioProvider>
                        <SavedAyahsSection
                            savedAyahs={localizedSavedAyahs}
                            readingMode={preferences.readingMode}
                        />
                    </QuranAudioProvider>

                    <section className="mt-16" aria-labelledby="coming-soon">
                        <div className="max-w-xl">
                            <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">
                                {t("upcoming.eyebrow")}
                            </p>
                            <h2
                                id="coming-soon"
                                className="mt-2 text-xl font-semibold tracking-tight"
                            >
                                {t("upcoming.title")}
                            </h2>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                {t("upcoming.description")}
                            </p>
                        </div>
                        <div className="mt-8 grid gap-8 sm:grid-cols-2 sm:gap-12">
                            {upcomingFeatures.map(({ icon: Icon, key }) => (
                                <article key={key} className="flex gap-4">
                                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                                        <Icon
                                            aria-hidden="true"
                                            className="size-5"
                                        />
                                    </span>
                                    <div>
                                        <p className="text-[0.65rem] font-semibold tracking-[0.16em] text-primary uppercase">
                                            {t("upcoming.inDevelopment")}
                                        </p>
                                        <h3 className="mt-1 font-semibold">
                                            {t(`upcoming.${key}.title`)}
                                        </h3>
                                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                            {t(`upcoming.${key}.description`)}
                                        </p>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </section>
                </section>
            </div>
        </main>
    );
}
