"use client";

import { useLocale, useTranslations } from "next-intl";
import type { PracticeReaderGroup } from "@/features/practice/reader-types";
import type { AssignmentReviewData } from "../server/get-assignment-review";
import AssignmentReviewReader from "./assignment-review-reader";
import ReviewDecisionForm from "./review-decision-form";

export default function AssignmentReview({
    review,
    readerGroups,
    pendingCount,
    compact = false,
    onSaved,
    onStale,
}: {
    review: AssignmentReviewData;
    readerGroups: PracticeReaderGroup[];
    pendingCount: number;
    compact?: boolean;
    onSaved?: (nextAssignmentId: string | null) => Promise<void>;
    onStale?: () => void;
}) {
    const t = useTranslations("Groups.review");
    const practiceT = useTranslations("Practice");
    const locale = useLocale();
    const { assignment, assignee } = review;
    if (!assignment.groupId) return null;
    const surahName = (number: number) => {
        const surah = readerGroups.find(
            (group) => group.surah.number === number,
        )?.surah;
        return (locale === "ar" ? surah?.name : surah?.englishName) ?? number;
    };
    return (
        <div className="space-y-6">
            <div>
                <p className="text-xs font-semibold text-primary">
                    {t("eyebrow")}
                </p>
                <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">
                    {t("title", { name: assignee.name })}
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    {practiceT(`kinds.${assignment.kind}`)}
                </p>
                <p className="mt-2 text-sm leading-6">
                    {practiceT("range", {
                        startSurah: surahName(assignment.start.surahNumber),
                        startAyah: assignment.start.ayahNumber,
                        endSurah: surahName(assignment.end.surahNumber),
                        endAyah: assignment.end.ayahNumber,
                    })}
                </p>
                {assignment.submittedAt && (
                    <p className="mt-2 text-xs text-muted-foreground">
                        {t("submitted", {
                            date: new Intl.DateTimeFormat(locale, {
                                dateStyle: "medium",
                                timeZone: "Africa/Casablanca",
                            }).format(new Date(assignment.submittedAt)),
                        })}
                    </p>
                )}
            </div>
            {assignment.instructions && (
                <section className="rounded-xl border bg-muted/20 p-4">
                    <h2 className="text-sm font-semibold">
                        {t("instructions")}
                    </h2>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                        {assignment.instructions}
                    </p>
                </section>
            )}
            <div
                className={
                    compact
                        ? "space-y-6"
                        : "grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start"
                }
            >
                <section>
                    <h2 className="mb-4 font-semibold">{t("quranText")}</h2>
                    <AssignmentReviewReader
                        groups={readerGroups}
                        riwayah={assignment.riwayah}
                    />
                </section>
                <div className={compact ? "" : "lg:sticky lg:top-24"}>
                    <ReviewDecisionForm
                        key={assignment.id}
                        groupId={assignment.groupId}
                        assignmentId={assignment.id}
                        pendingCount={pendingCount}
                        onSaved={onSaved}
                        onStale={onStale}
                    />
                </div>
            </div>
        </div>
    );
}
