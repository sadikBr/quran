"use client";

import {
    CircleCheck,
    MessageSquareText,
    RotateCcw,
    UserRound,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { GroupAssignmentSummary } from "../server/get-group-assignments";
import { getMeetingDisplayTimezone } from "../server/meeting-schedule";
import ReviewMethodLabel from "./review-method-label";

type Feedback = Pick<
    GroupAssignmentSummary,
    "status" | "reviewMethod" | "reviewerName" | "reviewNote" | "reviewedAt"
>;

export default function ReviewFeedbackCard({
    feedback,
    passage,
    timezone,
}: {
    feedback: Feedback;
    passage: string;
    timezone: string;
}) {
    const t = useTranslations("Groups");
    const locale = useLocale();
    const completed = feedback.status === "completed";
    const needsWork =
        feedback.status === "needs_revision" ||
        feedback.status === "not_completed";
    const StatusIcon = completed ? CircleCheck : needsWork ? RotateCcw : null;
    const note = feedback.reviewNote?.trim();

    return (
        <section
            id="your-feedback"
            aria-labelledby="your-feedback-title"
            className="scroll-mt-24 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm"
        >
            <div className="flex flex-wrap items-start gap-3 p-4 sm:gap-4 sm:p-5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <MessageSquareText aria-hidden="true" className="size-5" />
                </span>
                <div className="min-w-0 flex-1 basis-36">
                    <h2
                        id="your-feedback-title"
                        className="font-semibold leading-6"
                    >
                        {t("review.latestFeedback")}
                    </h2>
                    <p className="mt-1 break-words text-sm leading-6 text-muted-foreground">
                        {passage}
                    </p>
                </div>
                <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium leading-5 text-primary ring-1 ring-inset ring-primary/15">
                    {StatusIcon && (
                        <StatusIcon
                            aria-hidden="true"
                            className="size-3.5 shrink-0"
                        />
                    )}
                    {t(`assignments.statuses.${feedback.status}`)}
                </span>
            </div>
            <div className="border-t border-border/50 bg-muted/20 p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                    {feedback.reviewMethod && (
                        <div className="flex min-w-0 items-start gap-2">
                            <UserRound
                                aria-hidden="true"
                                className="mt-1 size-4 shrink-0 text-muted-foreground"
                            />
                            <ReviewMethodLabel
                                method={feedback.reviewMethod}
                                reviewerName={feedback.reviewerName}
                                className="mt-0 min-w-0 break-words text-sm leading-6 text-foreground"
                            />
                        </div>
                    )}
                    {feedback.reviewedAt && (
                        <time
                            dateTime={feedback.reviewedAt.toISOString()}
                            className="text-xs leading-6 text-muted-foreground"
                        >
                            {new Intl.DateTimeFormat(locale, {
                                dateStyle: "medium",
                                timeZone: getMeetingDisplayTimezone(
                                    timezone,
                                    feedback.reviewedAt,
                                ),
                            }).format(feedback.reviewedAt)}
                        </time>
                    )}
                </div>
                {note ? (
                    <div className="mt-3 border-s-2 border-primary/25 ps-3">
                        <p
                            dir="auto"
                            className="whitespace-pre-wrap break-words text-sm leading-7"
                        >
                            {note}
                        </p>
                    </div>
                ) : (
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                        {t("review.noWrittenFeedback")}
                    </p>
                )}
            </div>
        </section>
    );
}
