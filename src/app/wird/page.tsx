import {
    BookOpen,
    CalendarCheck,
    Check,
    ChevronDown,
    Clock3,
    MoonStar,
} from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createTranslator } from "next-intl";
import PageBackground from "@/components/page-background";
import PageHeading from "@/components/page-heading";
import SectionHeading from "@/components/section-heading";
import StickyAppHeader from "@/components/sticky-app-header";
import { Button } from "@/components/ui/button";
import { auth } from "@/features/auth/auth";
import KhatmahMilestones from "@/features/khatmah/components/khatmah-milestones";
import KhatmahPlanner from "@/features/khatmah/components/khatmah-planner";
import getKhatmahHistory from "@/features/khatmah/server/get-khatmah-history";
import getKhatmahPlan from "@/features/khatmah/server/get-khatmah-plan";
import PlanManagementNavigation from "@/features/plans/components/plan-management-navigation";
import getSurahsMeta from "@/features/quran/server/get-surahs-meta";
import getPreferences from "@/features/settings/server/get-preferences";
import WirdHistory from "@/features/wird/components/wird-history";
import WirdPreferenceForm from "@/features/wird/components/wird-preference-form";
import { wirdProgress } from "@/features/wird/progress";
import getDailyWird from "@/features/wird/server/get-daily-wird";
import getWirdHistory from "@/features/wird/server/get-wird-history";
import getWirdReaderData from "@/features/wird/server/get-wird-reader-data";
import type { WirdUnit } from "@/features/wird/types";
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
    const plansT = createTranslator({
        locale: preferences.language,
        messages,
        namespace: "Plans",
    });
    const progressSummary =
        wird && !wird.completed && !wird.scheduledForFuture
            ? await getWirdReaderData(wird, preferences)
                  .then((groups) =>
                      wirdProgress(
                          groups,
                          wird.progressGlobalAyah,
                          wird.progressVerse,
                          preferences.riwayah,
                      ),
                  )
                  .catch(() => null)
            : null;
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
            <div className="app-container ">
                <StickyAppHeader
                    navigation
                    className="-mx-4 px-4 sm:-mx-6 sm:px-6"
                />

                <section
                    data-tour="wird-page"
                    className="pb-12 pt-5 sm:pb-16 sm:pt-8"
                >
                    <PlanManagementNavigation />
                    <PageHeading
                        title={plansT("readingPlan")}
                        description={plansT("readingPlanHint")}
                        icon={<MoonStar />}
                    />

                    {!wird ? (
                        <section className="app-card mt-6 overflow-hidden">
                            <SectionHeading
                                title={t("setup.title")}
                                description={t("setup.description")}
                                icon={<CalendarCheck />}
                                className="p-4 sm:p-5"
                            />
                            <div className="app-card-body">
                                <WirdPreferenceForm />
                            </div>
                        </section>
                    ) : (
                        <>
                            <section className="app-card relative mt-6 overflow-hidden p-4 sm:p-5">
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
                                            "inline-flex w-fit shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold",
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
                                                  ? "today.scheduled"
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
                                              ? "today.scheduledDescription"
                                              : wird.carriedOver
                                                ? "today.carriedOverDescription"
                                                : "today.readyDescription",
                                        { date: wird.targetDate },
                                    )}
                                </p>
                                {!wird.completed &&
                                    !wird.scheduledForFuture && (
                                        <>
                                            {progressSummary && (
                                                <p className="mt-4 text-sm font-medium text-primary">
                                                    {progressSummary.next
                                                        ? t(
                                                              "today.resumeSummary",
                                                              {
                                                                  surah: isArabic
                                                                      ? progressSummary
                                                                            .next
                                                                            .surah
                                                                            .name
                                                                      : progressSummary
                                                                            .next
                                                                            .surah
                                                                            .englishName,
                                                                  ayah: String(
                                                                      progressSummary
                                                                          .next
                                                                          .ayah
                                                                          .numberInSurah,
                                                                  ),
                                                                  remaining:
                                                                      String(
                                                                          progressSummary.total -
                                                                              progressSummary.completed,
                                                                      ),
                                                              },
                                                          )
                                                        : t(
                                                              "today.readyToComplete",
                                                          )}
                                                </p>
                                            )}
                                            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                                                <Button
                                                    asChild
                                                    className="min-h-11"
                                                >
                                                    <Link
                                                        data-tour="wird-read"
                                                        href="/plans/today"
                                                    >
                                                        <BookOpen
                                                            aria-hidden="true"
                                                            className="size-4"
                                                        />
                                                        {plansT("goToToday")}
                                                    </Link>
                                                </Button>
                                            </div>
                                        </>
                                    )}
                            </section>

                            <details className="app-card group mt-4 overflow-hidden">
                                <summary className="flex min-h-20 cursor-pointer list-none items-center gap-3 p-4 font-semibold transition-colors hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:gap-4 sm:p-5 [&::-webkit-details-marker]:hidden">
                                    <span
                                        aria-hidden="true"
                                        className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
                                    >
                                        <CalendarCheck className="size-5" />
                                    </span>
                                    <h2 className="min-w-0 flex-1 leading-6">
                                        {t("today.changeGoal")}
                                    </h2>
                                    <ChevronDown
                                        aria-hidden="true"
                                        className="size-4 text-muted-foreground transition-transform group-open:rotate-180"
                                    />
                                </summary>
                                <div className="app-card-body">
                                    <WirdPreferenceForm
                                        key={
                                            khatmahPlan?.isActive
                                                ? "plan-managed"
                                                : "manual-goal"
                                        }
                                        compact
                                        managedByPlan={Boolean(
                                            khatmahPlan?.isActive,
                                        )}
                                        initialUnit={
                                            khatmahPlan?.isActive
                                                ? khatmahPlan.measurement
                                                : ((wird.nextGoal
                                                      ?.unit as WirdUnit) ??
                                                  wird.unit)
                                        }
                                        initialAmount={
                                            khatmahPlan?.isActive
                                                ? khatmahPlan.dailyAmount
                                                : (wird.nextGoal?.amount ??
                                                  wird.amount)
                                        }
                                    />
                                </div>
                            </details>
                        </>
                    )}

                    <KhatmahPlanner
                        key={khatmahPlan ? "existing-plan" : "no-plan"}
                        plan={khatmahPlan}
                        surahs={surahs.map((surah) => ({
                            number: surah.number,
                            name: surah.name,
                            englishName: surah.englishName,
                        }))}
                        initialStartSurah={initialStartSurah}
                    />

                    <KhatmahMilestones stats={khatmahHistory} />

                    <div data-tour="wird-history">
                        <WirdHistory stats={history} />
                    </div>
                </section>
            </div>
        </main>
    );
}
