"use client";

import { ClipboardCheck } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import PageHeading from "@/components/page-heading";
import SectionHeading from "@/components/section-heading";
import type { PracticeReaderGroup } from "@/features/practice/reader-types";
import type { AssignmentReviewData } from "../server/get-assignment-review";
import AssignmentReviewReader from "./assignment-review-reader";
import ReviewDecisionForm from "./review-decision-form";
import ReviewMethodLabel from "./review-method-label";

export default function AssignmentReview({
    review,
    readerGroups,
    pendingCount,
    compact = false,
    onSaved,
    onStale,
    onBusyChange,
    occurrence,
}: {
    review: AssignmentReviewData;
    readerGroups: PracticeReaderGroup[];
    pendingCount: number;
    compact?: boolean;
    onSaved?: (nextAssignmentId: string | null) => Promise<void>;
    onStale?: () => void;
    onBusyChange?: (busy: boolean) => void;
    occurrence?: string;
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
    const Heading = compact ? SectionHeading : PageHeading;
    return (
        <div className="space-y-6">
            <div>
                <Heading
                    title={t("title", { name: assignee.name })}
                    icon={<ClipboardCheck />}
                    description={`${practiceT(`kinds.${assignment.kind}`)} · ${practiceT(
                        "range",
                        {
                            startSurah: surahName(assignment.start.surahNumber),
                            startAyah: assignment.start.ayahNumber,
                            endSurah: surahName(assignment.end.surahNumber),
                            endAyah: assignment.end.ayahNumber,
                        },
                    )}`}
                />
                <ReviewMethodLabel method={assignment.reviewMethod} />
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
                <section className="app-card p-4 sm:p-5">
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
                        : occurrence
                          ? "grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start"
                          : "space-y-6"
                }
            >
                <section>
                    <h2 className="mb-4 font-semibold">{t("quranText")}</h2>
                    <AssignmentReviewReader
                        groups={readerGroups}
                        riwayah={assignment.riwayah}
                    />
                </section>
                {occurrence && review.canReview ? (
                    <div className={compact ? "" : "lg:sticky lg:top-24"}>
                        <ReviewDecisionForm
                            key={assignment.id}
                            groupId={assignment.groupId}
                            assignmentId={assignment.id}
                            occurrence={occurrence}
                            submitted={assignment.status === "submitted"}
                            pendingCount={pendingCount}
                            onSaved={onSaved}
                            onStale={onStale}
                            onBusyChange={onBusyChange}
                        />
                    </div>
                ) : (
                    <section className="app-card p-4 sm:p-5">
                        <p className="text-sm text-muted-foreground">
                            {t("feedback")}
                        </p>
                        {assignment.reviewNote && (
                            <p className="mt-3 whitespace-pre-wrap text-sm">
                                {assignment.reviewNote}
                            </p>
                        )}
                    </section>
                )}
            </div>
        </div>
    );
}
