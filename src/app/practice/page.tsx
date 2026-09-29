import { ArrowRight, BookMarked, ChevronDown, RefreshCcw } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createTranslator } from "next-intl";
import PageBackground from "@/components/page-background";
import StickyAppHeader from "@/components/sticky-app-header";
import { Button } from "@/components/ui/button";
import { auth } from "@/features/auth/auth";
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

export default async function PracticePage() {
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
    const messages = await getMessages(preferences.language);
    const t = createTranslator({
        locale: preferences.language,
        messages,
        namespace: "Practice",
    });
    const groupsT = createTranslator({
        locale: preferences.language,
        messages,
        namespace: "Groups.assignments",
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
                    <div className="border-b border-border/60 pb-6">
                        <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
                            {t("eyebrow")}
                        </p>
                        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                            {t("title")}
                        </h1>
                        <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
                            {t("description")}
                        </p>
                    </div>

                    {assignedWork.length > 0 && (
                        <section className="mt-6">
                            <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">
                                {groupsT("eyebrow")}
                            </p>
                            <h2 className="mt-2 text-xl font-semibold">
                                {groupsT("title")}
                            </h2>
                            <div className="mt-5 grid gap-4 lg:grid-cols-2">
                                {assignedWork.map((assignment) => (
                                    <article
                                        key={assignment.id}
                                        className="flex flex-col rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm sm:p-5"
                                    >
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <span className="text-xs font-semibold tracking-[0.12em] text-primary uppercase">
                                                {groupsT(
                                                    `kinds.${assignment.kind}`,
                                                )}
                                            </span>
                                            <span
                                                className={cn(
                                                    "rounded-lg px-2.5 py-1 text-xs font-medium",
                                                    assignment.status ===
                                                        "needs_revision"
                                                        ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                                                        : assignment.status ===
                                                            "completed"
                                                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                                          : "bg-muted text-muted-foreground",
                                                )}
                                            >
                                                {groupsT(
                                                    `statuses.${assignment.status}`,
                                                )}
                                            </span>
                                        </div>
                                        <h3 className="mt-4 font-semibold leading-7">
                                            {t("range", {
                                                startSurah:
                                                    surahName(
                                                        assignment.start
                                                            .surahNumber,
                                                    ) ?? "",
                                                startAyah:
                                                    assignment.start.ayahNumber,
                                                endSurah:
                                                    surahName(
                                                        assignment.end
                                                            .surahNumber,
                                                    ) ?? "",
                                                endAyah:
                                                    assignment.end.ayahNumber,
                                            })}
                                        </h3>
                                        <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                                            {assignment.groupName && (
                                                <p>
                                                    {groupsT("fromGroup", {
                                                        group: assignment.groupName,
                                                    })}
                                                </p>
                                            )}
                                            {assignment.assignedByName && (
                                                <p>
                                                    {groupsT("assignedBy", {
                                                        name: assignment.assignedByName,
                                                    })}
                                                </p>
                                            )}
                                            {assignment.dueAt && (
                                                <p>
                                                    {groupsT("due", {
                                                        date: new Intl.DateTimeFormat(
                                                            preferences.language,
                                                            {
                                                                dateStyle:
                                                                    "medium",
                                                                timeZone: "UTC",
                                                            },
                                                        ).format(
                                                            assignment.dueAt,
                                                        ),
                                                    })}
                                                </p>
                                            )}
                                        </div>
                                        {assignment.instructions && (
                                            <p className="mt-4 rounded-xl bg-background/55 px-4 py-3 text-sm leading-6 text-muted-foreground">
                                                {assignment.instructions}
                                            </p>
                                        )}
                                        {assignment.reviewNote && (
                                            <div className="mt-4 rounded-xl bg-primary/[0.07] px-4 py-3 ring-1 ring-primary/10">
                                                <p className="text-xs font-semibold text-primary">
                                                    {t("reader.feedbackTitle")}
                                                </p>
                                                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                                    {assignment.reviewNote}
                                                </p>
                                            </div>
                                        )}
                                        <div className="mt-auto pt-5">
                                            <Button
                                                asChild
                                                variant="outline"
                                                className="min-h-11 w-full rounded-xl sm:w-auto"
                                            >
                                                <Link
                                                    href={`/practice/${assignment.id}/read`}
                                                >
                                                    {assignment.progress
                                                        ? t("continue")
                                                        : t("start")}
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
                                        </div>
                                    </article>
                                ))}
                            </div>
                        </section>
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
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                {t("personalDescription")}
                            </p>
                            <div className="mt-4 grid gap-4 lg:grid-cols-2">
                                {assignments.map((assignment) => (
                                    <section
                                        key={assignment.id}
                                        className="relative overflow-hidden rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm sm:p-5"
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
                                                    <Link
                                                        href={`/practice/${assignment.id}/read`}
                                                    >
                                                        {assignment.progress
                                                            ? t("continue")
                                                            : t("start")}
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
                        open={assignments.length === 0}
                        className="group mt-6 rounded-2xl border border-border/70 bg-card/60"
                    >
                        <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-3 rounded-2xl p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-6 [&::-webkit-details-marker]:hidden">
                            <h2 className="text-lg font-semibold">
                                {t(
                                    assignments.length > 0
                                        ? "form.editTitle"
                                        : "form.createTitle",
                                )}
                            </h2>
                            <ChevronDown
                                aria-hidden="true"
                                className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                            />
                        </summary>
                        <div className="border-t border-border/60 px-4 pb-5 pt-3 sm:px-6">
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                {t("form.description")}
                            </p>
                            <PracticeRangeForm
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
