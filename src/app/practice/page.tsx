import { ArrowLeft, ArrowRight, BookMarked, RefreshCcw } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createTranslator } from "next-intl";
import PageBackground from "@/components/page-background";
import StickyAppHeader from "@/components/sticky-app-header";
import { Button } from "@/components/ui/button";
import UserMenu from "@/components/user-menu";
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
import getReadingProgress from "@/features/reading-progress/server/get-reading-progress";
import getPreferences from "@/features/settings/server/get-preferences";
import { getMessages, getTextDirection } from "@/i18n/config";
import { cn } from "@/lib/utils";

export default async function PracticePage() {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) redirect("/sign-in");

    const [preferences, assignments, assignedWork, readingProgress, surahs] =
        await Promise.all([
            getPreferences(),
            getPracticeAssignments(session.user.id),
            getAssignedPracticeAssignments(session.user.id),
            getReadingProgress(),
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
    const homeT = createTranslator({
        locale: preferences.language,
        messages,
        namespace: "Home",
    });
    const groupsT = createTranslator({
        locale: preferences.language,
        messages,
        namespace: "Groups.assignments",
    });
    const continueReadingHref = `/quran/${preferences.readingMode}/${
        preferences.readingMode === "page"
            ? (readingProgress.lastPageNumber ?? 1)
            : (readingProgress.lastSurahNumber ?? 1)
    }`;
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
            <div className="mx-auto max-w-5xl px-4 sm:px-6">
                <StickyAppHeader className="-mx-4 px-4 sm:-mx-6 sm:px-6">
                    <Link
                        href="/"
                        className="group flex items-center gap-3 rounded-md outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                            <BookMarked aria-hidden="true" className="size-5" />
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

                <section className="py-10 sm:py-14">
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
                    >
                        <ArrowLeft
                            aria-hidden="true"
                            className={cn("size-4", isArabic && "rotate-180")}
                        />
                        {t("back")}
                    </Link>

                    <div className="mt-9 max-w-2xl">
                        <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
                            {t("eyebrow")}
                        </p>
                        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                            {t("title")}
                        </h1>
                        <p className="mt-4 leading-7 text-muted-foreground">
                            {t("description")}
                        </p>
                    </div>

                    {assignedWork.length > 0 && (
                        <section className="mt-10">
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
                                        className="rounded-3xl bg-primary/[0.07] p-6 ring-1 ring-primary/15"
                                    >
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <span className="text-xs font-semibold tracking-[0.12em] text-primary uppercase">
                                                {groupsT(
                                                    `kinds.${assignment.kind}`,
                                                )}
                                            </span>
                                            <span className="rounded-full bg-background/70 px-3 py-1 text-xs text-muted-foreground ring-1 ring-border/50">
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
                                        <Button
                                            asChild
                                            className="mt-5 rounded-xl"
                                        >
                                            <Link
                                                href={`/practice/${assignment.id}/read`}
                                            >
                                                {assignment.progress
                                                    ? t("continue")
                                                    : t("start")}
                                                <ArrowRight
                                                    className={cn(
                                                        "size-4",
                                                        isArabic &&
                                                            "rotate-180",
                                                    )}
                                                />
                                            </Link>
                                        </Button>
                                    </article>
                                ))}
                            </div>
                        </section>
                    )}

                    {assignments.length > 0 && (
                        <div className="mt-10 grid gap-4 lg:grid-cols-2">
                            {assignments.map((assignment) => (
                                <section
                                    key={assignment.id}
                                    className="relative overflow-hidden rounded-3xl bg-primary/[0.07] p-6 ring-1 ring-primary/15"
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
                                        <h2 className="mt-3 text-lg font-semibold leading-8 sm:text-xl">
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
                                        </h2>
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
                                                className="rounded-xl"
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
                    )}

                    <section className="mt-10 max-w-3xl rounded-3xl bg-muted/40 p-5 ring-1 ring-border/50 sm:p-8">
                        <h2 className="text-xl font-semibold">
                            {t(
                                assignments.length > 0
                                    ? "form.editTitle"
                                    : "form.createTitle",
                            )}
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            {t("form.description")}
                        </p>
                        <PracticeRangeForm
                            surahs={options}
                            navigation={navigation}
                            assignments={assignments}
                            locale={preferences.language}
                        />
                    </section>
                </section>
            </div>
        </main>
    );
}
