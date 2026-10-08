import {
    ArrowRight,
    BookMarked,
    CalendarCheck2,
    CalendarDays,
    ChevronDown,
    RefreshCcw,
} from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createTranslator } from "next-intl";
import ActionCard from "@/components/action-card";
import PageBackground from "@/components/page-background";
import PageHeading from "@/components/page-heading";
import StickyAppHeader from "@/components/sticky-app-header";
import { Button } from "@/components/ui/button";
import { auth } from "@/features/auth/auth";
import getMemoryCatalogue from "@/features/memorization/server/get-memory-catalogue";
import PlanManagementNavigation from "@/features/plans/components/plan-management-navigation";
import DeletePracticeButton from "@/features/practice/components/delete-practice-button";
import PracticeRangeForm from "@/features/practice/components/practice-range-form";
import {
    getAssignedPracticeAssignments,
    getPracticeAssignments,
} from "@/features/practice/server/get-practice-assignment";
import getQuranNavigationMeta from "@/features/quran/server/get-quran-navigation-meta";
import getSurahsMeta from "@/features/quran/server/get-surahs-meta";
import {
    getWarshChapters,
    getWarshNavigationMeta,
} from "@/features/quran/server/get-warsh-mushaf";
import getPreferences from "@/features/settings/server/get-preferences";
import { getMessages, getTextDirection } from "@/i18n/config";
import { cn } from "@/lib/utils";

export default async function PracticePage({
    searchParams,
}: {
    searchParams: Promise<{ hizb?: string }>;
}) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) redirect("/sign-in");

    const [preferences, assignments, assignedWork, surahs] = await Promise.all([
        getPreferences(),
        getPracticeAssignments(session.user.id),
        getAssignedPracticeAssignments(session.user.id),
        getSurahsMeta(),
    ]);
    const [warshChapters, navigation] = await Promise.all([
        preferences.riwayah === "warsh"
            ? getWarshChapters()
            : Promise.resolve([]),
        preferences.riwayah === "warsh"
            ? getWarshNavigationMeta()
            : getQuranNavigationMeta(),
    ]);
    const warshCounts = new Map(
        warshChapters.map((chapter) => [chapter.id, chapter.verses.length]),
    );
    const options = surahs.map((surah) => ({
        ...surah,
        numberOfAyahs: warshCounts.get(surah.number) ?? surah.numberOfAyahs,
    }));
    const hizb = Number((await searchParams).hizb);
    const rangeVerses =
        Number.isInteger(hizb) && hizb >= 1 && hizb <= 60
            ? (await getMemoryCatalogue())[preferences.riwayah].filter(
                  (verse) => verse.hizb === hizb,
              )
            : [];
    const first = rangeVerses[0];
    const last = rangeVerses.at(-1);
    const initialRange =
        first && last
            ? {
                  start: {
                      surahNumber: first.surahNumber,
                      ayahNumber: first.ayahNumber,
                  },
                  end: {
                      surahNumber: last.surahNumber,
                      ayahNumber: last.ayahNumber,
                  },
              }
            : undefined;
    const messages = await getMessages(preferences.language);
    const t = createTranslator({
        locale: preferences.language,
        messages,
        namespace: "Practice",
    });
    const plansT = createTranslator({
        locale: preferences.language,
        messages,
        namespace: "Plans",
    });
    const isArabic = preferences.language === "ar";
    const surahName = (number: number) => {
        const surah = surahs.find((item) => item.number === number);
        return isArabic ? surah?.name : surah?.englishName;
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
            <div className="app-container ">
                <StickyAppHeader
                    navigation
                    className="-mx-4 px-4 sm:-mx-6 sm:px-6"
                />

                <section className="pb-12 pt-5 sm:pb-16 sm:pt-8">
                    <PlanManagementNavigation />
                    <PageHeading
                        title={plansT("personalPractice")}
                        description={plansT("personalPracticeHint")}
                        icon={<BookMarked />}
                        actions={
                            <Button asChild variant="outline">
                                <Link href="/plans/today">
                                    <CalendarDays className="size-4" />
                                    {plansT("goToToday")}
                                </Link>
                            </Button>
                        }
                    />

                    {assignedWork.length > 0 && (
                        <ActionCard
                            className="mt-6"
                            href="/assignments"
                            icon={<CalendarCheck2 />}
                            title={t("assignedWork.title", {
                                count: assignedWork.length,
                            })}
                            description={t("assignedWork.description")}
                        />
                    )}

                    {assignments.length > 0 && (
                        <section
                            className="mt-8"
                            aria-labelledby="personal-practice-title"
                        >
                            <h2
                                id="personal-practice-title"
                                className="text-xl font-semibold"
                            >
                                {t("personalTitle")}
                            </h2>
                            <div className="mt-4 grid gap-4 lg:grid-cols-2">
                                {assignments.map((assignment) => (
                                    <section
                                        key={assignment.id}
                                        className="relative overflow-hidden app-card p-4 sm:p-5"
                                    >
                                        <div className="flex h-full flex-col">
                                            <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.14em] text-primary uppercase">
                                                {assignment.kind ===
                                                "memorization" ? (
                                                    <BookMarked
                                                        aria-hidden="true"
                                                        className="size-4"
                                                    />
                                                ) : (
                                                    <RefreshCcw
                                                        aria-hidden="true"
                                                        className="size-4"
                                                    />
                                                )}
                                                {t(`kinds.${assignment.kind}`)}
                                            </div>
                                            <h3 className="mt-3 text-base font-semibold leading-7 sm:text-lg">
                                                {assignment.plannedDate && (
                                                    <span className="mb-2 block text-xs font-medium text-division">
                                                        {t("plannedFor", {
                                                            date: new Intl.DateTimeFormat(
                                                                preferences.language,
                                                                {
                                                                    weekday:
                                                                        "short",
                                                                    month: "short",
                                                                    day: "numeric",
                                                                    timeZone:
                                                                        "UTC",
                                                                },
                                                            ).format(
                                                                new Date(
                                                                    `${assignment.plannedDate}T12:00:00Z`,
                                                                ),
                                                            ),
                                                        })}
                                                    </span>
                                                )}
                                                {t("range", {
                                                    startSurah:
                                                        surahName(
                                                            assignment.start
                                                                .surahNumber,
                                                        ) ?? "",
                                                    startAyah:
                                                        assignment.start
                                                            .ayahNumber,
                                                    endSurah:
                                                        surahName(
                                                            assignment.end
                                                                .surahNumber,
                                                        ) ?? "",
                                                    endAyah:
                                                        assignment.end
                                                            .ayahNumber,
                                                })}
                                            </h3>
                                            <p className="mt-2 text-sm text-muted-foreground">
                                                {t("riwayah", {
                                                    riwayah: t(
                                                        `riwayahs.${assignment.riwayah}`,
                                                    ),
                                                })}
                                            </p>
                                            <div className="mt-6 flex flex-wrap items-center gap-2 lg:mt-auto lg:pt-6">
                                                <Button
                                                    asChild
                                                    className="min-h-11 w-full rounded-xl sm:w-auto"
                                                >
                                                    <Link href="/plans/today">
                                                        {plansT("goToToday")}
                                                        <ArrowRight
                                                            aria-hidden="true"
                                                            className={cn(
                                                                "size-4",
                                                                isArabic &&
                                                                    "rotate-180",
                                                            )}
                                                        />
                                                    </Link>
                                                </Button>
                                                <DeletePracticeButton
                                                    assignmentId={assignment.id}
                                                />
                                            </div>
                                        </div>
                                    </section>
                                ))}
                            </div>
                        </section>
                    )}

                    <details
                        id="practice-range"
                        open={Boolean(initialRange) || assignments.length === 0}
                        className="app-card group mt-6 overflow-hidden"
                    >
                        <summary className="flex min-h-20 cursor-pointer list-none items-center gap-3 p-4 transition-colors hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:gap-4 sm:p-5 [&::-webkit-details-marker]:hidden">
                            <span
                                aria-hidden="true"
                                className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
                            >
                                <BookMarked className="size-5" />
                            </span>
                            <div className="min-w-0 flex-1">
                                <h2 className="font-semibold leading-6">
                                    {t(
                                        assignments.length > 0
                                            ? "form.editTitle"
                                            : "form.createTitle",
                                    )}
                                </h2>
                                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                    {t("form.description")}
                                </p>
                            </div>
                            <ChevronDown
                                aria-hidden="true"
                                className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                            />
                        </summary>
                        <div className="app-card-body pt-0 sm:pt-0">
                            <PracticeRangeForm
                                key={initialRange ? hizb : "saved"}
                                initialRange={initialRange}
                                surahs={options}
                                navigation={navigation}
                                assignments={assignments}
                                locale={preferences.language}
                            />
                        </div>
                    </details>
                </section>
            </div>
        </main>
    );
}
