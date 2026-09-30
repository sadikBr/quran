"use client";

import { CheckCircle2, LoaderCircle, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import reviewMemberAssignment from "../server/review-member-assignment";

export default function ReviewDecisionForm({
    groupId,
    assignmentId,
    pendingCount,
    submitted = true,
    onSaved,
    onStale,
}: {
    groupId: string;
    assignmentId: string;
    pendingCount: number;
    submitted?: boolean;
    onSaved?: (nextAssignmentId: string | null) => Promise<void>;
    onStale?: () => void;
}) {
    const t = useTranslations("Groups.review");
    const router = useRouter();
    const [note, setNote] = useState("");
    const [decision, setDecision] = useState<
        "completed" | "needs_revision" | "not_completed"
    >(submitted ? "completed" : "not_completed");
    const [pending, setPending] = useState(false);
    const savingRef = useRef(false);

    async function save(reviewNext: boolean) {
        if (savingRef.current) return;
        savingRef.current = true;
        setPending(true);
        try {
            const result = await reviewMemberAssignment({
                groupId,
                assignmentId,
                decision,
                note,
                reviewNext,
            });

            if (!result.success) {
                savingRef.current = false;
                toast.error(
                    t(
                        result.reason === "no_next_meeting"
                            ? "noNextMeeting"
                            : "error",
                    ),
                );
                if (result.reason === "not_submitted") {
                    if (onStale) onStale();
                    else router.refresh();
                }
                return;
            }

            toast.success(
                t(
                    decision === "completed"
                        ? "completedSuccess"
                        : decision === "not_completed"
                          ? "notCompletedSuccess"
                          : "revisionSuccess",
                ),
            );
            if (onSaved) {
                await onSaved(reviewNext ? result.nextAssignmentId : null);
                return;
            }
            if (reviewNext && result.nextAssignmentId) {
                router.replace(
                    `/groups/${groupId}/review/${result.nextAssignmentId}`,
                );
            } else {
                if (reviewNext) toast.success(t("queueComplete"));
                router.replace(`/assignments?view=manage&group=${groupId}`);
            }
            router.refresh();
            // Stay disabled until navigation unmounts this keyed form.
        } catch {
            toast.error(t("error"));
            savingRef.current = false;
            setPending(false);
        } finally {
            // Failed validations leave the feedback in place for retry.
            if (!savingRef.current) setPending(false);
        }
    }

    return (
        <section className="rounded-2xl border border-primary/15 bg-primary/[0.035] p-4 sm:p-6">
            <h2 className="text-xl font-semibold">{t("decisionTitle")}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {t("decisionDescription")}
            </p>
            <p className="mt-3 text-sm font-medium text-primary">
                {t("queueRemaining", { count: pendingCount })}
            </p>
            <fieldset disabled={pending} className="mt-5 grid gap-2">
                <legend className="sr-only">{t("decisionTitle")}</legend>
                {(submitted
                    ? ([
                          "completed",
                          "needs_revision",
                          "not_completed",
                      ] as const)
                    : (["not_completed"] as const)
                ).map((value) => {
                    const Icon =
                        value === "completed" ? CheckCircle2 : RotateCcw;
                    return (
                        <label key={value} className="cursor-pointer">
                            <input
                                className="peer sr-only"
                                type="radio"
                                name="review-decision"
                                value={value}
                                checked={decision === value}
                                onChange={() => setDecision(value)}
                            />
                            <span className="flex min-h-12 items-center gap-3 rounded-xl border bg-background/60 px-4 py-3 text-sm peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring">
                                <Icon
                                    className="size-4 shrink-0"
                                    aria-hidden="true"
                                />
                                {t(
                                    value === "completed"
                                        ? "complete"
                                        : value === "not_completed"
                                          ? "notCompleted"
                                          : "needsRevision",
                                )}
                            </span>
                        </label>
                    );
                })}
            </fieldset>
            <div className="mt-6">
                <Label htmlFor="review-note">{t("note")}</Label>
                <Textarea
                    id="review-note"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    maxLength={1000}
                    disabled={pending}
                    dir="auto"
                    placeholder={t("notePlaceholder")}
                    className="mt-2 min-h-28 rounded-xl bg-background/70"
                />
            </div>
            <div className="mt-5 grid gap-2">
                <Button
                    type="button"
                    disabled={pending}
                    onClick={() => save(true)}
                    className="min-h-12 rounded-xl whitespace-normal"
                >
                    {pending ? (
                        <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                        <CheckCircle2 className="size-4" />
                    )}
                    {t(
                        pending
                            ? "saving"
                            : pendingCount > 1
                              ? "saveAndNext"
                              : "saveAndFinish",
                    )}
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    disabled={pending}
                    onClick={() => save(false)}
                    className="h-auto min-h-12 rounded-xl whitespace-normal px-3 py-3 text-center"
                >
                    {t(onSaved ? "saveAndReturnToQueue" : "saveAndReturn")}
                </Button>
            </div>
            {decision !== "completed" && (
                <p className="mt-4 text-xs leading-5 text-muted-foreground">
                    {t(
                        decision === "not_completed"
                            ? "notCompletedHint"
                            : "revisionHint",
                    )}
                </p>
            )}
        </section>
    );
}
