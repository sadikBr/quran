import {
    BookOpen,
    CalendarCheck,
    Check,
    ChevronDown,
    Clock3,
} from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createTranslator } from "next-intl";
import PageBackground from "@/components/page-background";
import StickyAppHeader from "@/components/sticky-app-header";
import { Button } from "@/components/ui/button";
import { auth } from "@/features/auth/auth";
import KhatmahMilestones from "@/features/khatmah/components/khatmah-milestones";
import KhatmahPlanner from "@/features/khatmah/components/khatmah-planner";
import getKhatmahHistory from "@/features/khatmah/server/get-khatmah-history";
import getKhatmahPlan from "@/features/khatmah/server/get-khatmah-plan";
import getSurahsMeta from "@/features/quran/server/get-surahs-meta";
import getPreferences from "@/features/settings/server/get-preferences";
import CompleteWirdButton from "@/features/wird/components/complete-wird-button";
import WirdHistory from "@/features/wird/components/wird-history";
import WirdPreferenceForm from "@/features/wird/components/wird-preference-form";
import getDailyWird from "@/features/wird/server/get-daily-wird";
import getWirdHistory from "@/features/wird/server/get-wird-history";
import { getMessages, getTextDirection } from "@/i18n/config";
import { cn } from "@/lib/utils";

export default async function WirdPage() {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) redirect("/sign-in");

    const [preferences] = await Promise.all([getPreferences()]);
    const [messages, wird, history, khatmahPlan, khatmahHistory, surahs] =
        await Promise.all([
            getMessages(preferences.language),
            getDailyWird(session.user.id, preferences.arabicEdition),
            getWirdHistory(session.user.id),
            getKhatmahPlan(session.user.id),
            getKhatmahHistory(session.user.id),
            getSurahsMeta(),
        ]);
    const t = createTranslator({
        locale: preferences.language,
        messages,
        namespace: "Wird",
    });
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
    let initialStartSurah = 1;
    if (khatmahPlan) {
        let cursor = 1;
        for (const surah of surahs) {
            if (cursor > khatmahPlan.startGlobalAyah) break;
            initialStartSurah = surah.number;
            cursor += surah.numberOfAyahs;
        }
    }

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
            <div className="mx-auto max-w-5xl px-4 sm:px-6">
                <StickyAppHeader
                    navigation
                    className="-mx-4 px-4 sm:-mx-6 sm:px-6"
                />

                <section className="pb-12 pt-5 sm:pb-16 sm:pt-8">
                    <div className="border-b border-border/60 pb-6">
                        <p className="text-xs font-semibold tracking-[0.18em] text-primary">
                            {t("eyebrow")}
                        </p>
                        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                            {t("title")}
                        </h1>
                        <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
                            {t("description")}
                        </p>
                    </div>

                    {!wird ? (
                        <section className="mt-6 rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm sm:p-6">
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
                            <section className="relative mt-6 overflow-hidden rounded-2xl border border-primary/20 bg-card/90 p-5 shadow-sm sm:p-7">
                                <div className="absolute inset-y-0 start-0 w-1 bg-primary" />
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="max-w-2xl">
                                        <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.16em] text-primary uppercase">
                                            <CalendarCheck
                                                aria-hidden="true"
                                                className="size-4"
                                            />
                                            {t("today.eyebrow")}
                                        </div>
                                        <p className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                                            {t("today.goal", {
                                                amount: wird.amount,
                                                unit: t(`units.${wird.unit}`),
                                            })}
                                        </p>
                                        <h2 className="mt-3 text-lg font-semibold leading-8 sm:text-xl">
                                            {range}
                                        </h2>
                                        <p className="mt-2 text-sm text-muted-foreground">
                                            {pages}
                                        </p>
                                    </div>
                                    <span
                                        className={cn(
                                            "inline-flex w-fit shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold",
                                            wird.completed
                                                ? "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400"
                                                : wird.scheduledForFuture
                                                  ? "bg-sky-500/12 text-sky-600 dark:text-sky-400"
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
                                                : wird.scheduledForFuture
                                                  ? "today.restDay"
                                                  : wird.carriedOver
                                                    ? "today.carriedOver"
                                                    : "today.ready",
                                        )}
                                    </span>
                                </div>
                                <p className="mt-5 max-w-2xl text-sm leading-6 text-muted-foreground">
                                    {t(
                                        wird.completed
                                            ? "today.completedDescription"
                                            : wird.scheduledForFuture
                                              ? "today.restDayDescription"
                                              : wird.carriedOver
                                                ? "today.carriedOverDescription"
                                                : "today.readyDescription",
                                    )}
                                </p>
                                {!wird.completed &&
                                    !wird.scheduledForFuture && (
                                        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                                            <Button
                                                asChild
                                                className="min-h-11"
                                            >
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

                            <details className="group mt-4 rounded-2xl border border-border/70 bg-card/60">
                                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-6 [&::-webkit-details-marker]:hidden">
                                    {t("today.changeGoal")}
                                    <ChevronDown
                                        aria-hidden="true"
                                        className="size-4 text-muted-foreground transition-transform group-open:rotate-180"
                                    />
                                </summary>
                                <div className="border-t border-border/60 px-4 pb-5 sm:px-6">
                                    <WirdPreferenceForm
                                        compact
                                        initialUnit={wird.unit}
                                        initialAmount={wird.amount}
                                    />
                                </div>
                            </details>
                        </>
                    )}

                    <KhatmahPlanner
                        plan={khatmahPlan}
                        surahs={surahs.map((surah) => ({
                            number: surah.number,
                            name: surah.name,
                            englishName: surah.englishName,
                        }))}
                        initialStartSurah={initialStartSurah}
                    />

                    <KhatmahMilestones stats={khatmahHistory} />

                    <WirdHistory stats={history} />
                </section>
            </div>
        </main>
    );
}
