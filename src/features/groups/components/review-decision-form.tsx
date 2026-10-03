"use client";

import { CheckCircle2, LoaderCircle, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import MistakeEditor, {
    type ReferenceOption,
} from "@/features/retention/components/mistake-editor";
import type { MistakeInput } from "@/features/retention/types";
import getRevisionAvailability from "../server/get-revision-availability";
import { getMeetingDisplayTimezone } from "../server/meeting-schedule";
import reviewMemberAssignment from "../server/review-member-assignment";

export default function ReviewDecisionForm({
    groupId,
    assignmentId,
    occurrence,
    pendingCount,
    submitted = true,
    onSaved,
    onStale,
    onBusyChange,
    references = [],
}: {
    groupId: string;
    assignmentId: string;
    occurrence: string;
    pendingCount: number;
    submitted?: boolean;
    onSaved?: (nextAssignmentId: string | null) => Promise<void>;
    onStale?: () => void;
    onBusyChange?: (busy: boolean) => void;
    references?: ReferenceOption[];
}) {
    const t = useTranslations("Groups.review");
    const flow = useTranslations("Groups.flow");
    const retention = useTranslations("Memorization.retention");
    const [mistakes, setMistakes] = useState<MistakeInput[]>([]);
    const locale = useLocale();
    const [schedule, setSchedule] = useState<Awaited<
        ReturnType<typeof getRevisionAvailability>
    > | null>(null);
    const [checking, setChecking] = useState(true);
    const [scheduleError, setScheduleError] = useState(false);
    const requestId = useRef(0);
    const checkSchedule = useCallback(async () => {
        const request = ++requestId.current;
        setChecking(true);
        setScheduleError(false);
        try {
            const result = await getRevisionAvailability(
                groupId,
                assignmentId,
                occurrence,
            );
            if (request === requestId.current) setSchedule(result);
        } catch {
            if (request === requestId.current) setScheduleError(true);
        } finally {
            if (request === requestId.current) setChecking(false);
        }
    }, [groupId, assignmentId, occurrence]);
    useEffect(() => {
        void checkSchedule();
        const refresh = () => {
            void checkSchedule();
        };
        window.addEventListener("focus", refresh);
        return () => {
            requestId.current++;
            window.removeEventListener("focus", refresh);
        };
    }, [checkSchedule]);
    const router = useRouter();
    const [note, setNote] = useState("");
    const [decision, setDecision] = useState<
        "completed" | "needs_revision" | "not_completed"
    >(submitted ? "completed" : "not_completed");
    const [pending, setPending] = useState(false);
    const savingRef = useRef(false);
    const needsSchedule = decision !== "completed";
    const blocked =
        needsSchedule && (checking || scheduleError || !schedule?.next);

    async function save(reviewNext: boolean) {
        if (savingRef.current || blocked) return;
        savingRef.current = true;
        setPending(true);
        onBusyChange?.(true);
        try {
            const result = await reviewMemberAssignment({
                groupId,
                assignmentId,
                occurrence,
                decision,
                note,
                reviewNext,
                mistakes: decision === "not_completed" ? [] : mistakes,
            });

            if (!result.success) {
                if (result.reason === "no_next_meeting")
                    setSchedule({
                        next: null,
                        timezone: schedule?.timezone ?? "UTC",
                    });
                savingRef.current = false;
                toast.error(
                    t(
                        result.reason === "meeting_required"
                            ? "meetingRequired"
                            : result.reason === "no_next_meeting"
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
            onBusyChange?.(false);
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
            {decision !== "not_completed" && references.length > 0 && (
                <div className="mt-6 space-y-3 rounded-2xl border border-border/60 bg-background/60 p-4">
                    <p className="text-xs leading-6 text-muted-foreground">
                        {retention("reviewerHint")}
                    </p>
                    {mistakes.map((m, i) => (
                        <div
                            key={`${m.surahNumber}:${m.ayahNumber}:${m.kind}`}
                            className="flex items-center justify-between gap-2 text-sm"
                        >
                            <span>
                                {m.surahNumber}:{m.ayahNumber} ·{" "}
                                {retention(`kinds.${m.kind}`)}
                            </span>
                            <Button
                                type="button"
                                variant="ghost"
                                disabled={pending}
                                className="min-h-11 shrink-0"
                                onClick={() =>
                                    setMistakes(
                                        mistakes.filter((_, n) => n !== i),
                                    )
                                }
                            >
                                {retention("remove")}
                            </Button>
                        </div>
                    ))}
                    <MistakeEditor
                        references={references}
                        disabled={pending || mistakes.length >= 20}
                        onAdd={(value) => {
                            setMistakes((items) => [
                                ...items.filter(
                                    (m) =>
                                        !(
                                            m.surahNumber ===
                                                value.surahNumber &&
                                            m.ayahNumber === value.ayahNumber &&
                                            m.kind === value.kind
                                        ),
                                ),
                                value,
                            ]);
                            return true;
                        }}
                    />
                </div>
            )}
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
                {needsSchedule && (
                    <div
                        aria-live="polite"
                        className="rounded-xl border border-border/60 bg-background/60 p-3 text-sm leading-6"
                    >
                        <p>
                            {checking
                                ? flow("checkingSchedule")
                                : scheduleError
                                  ? flow("scheduleError")
                                  : !schedule?.next
                                    ? flow("needsSchedule")
                                    : flow("nextReview", {
                                          date: new Intl.DateTimeFormat(
                                              locale,
                                              {
                                                  dateStyle: "medium",
                                                  timeStyle: "short",
                                                  timeZone:
                                                      getMeetingDisplayTimezone(
                                                          schedule.timezone,
                                                          new Date(
                                                              schedule.next,
                                                          ),
                                                      ),
                                              },
                                          ).format(new Date(schedule.next)),
                                      })}
                        </p>
                        {!checking && (scheduleError || !schedule?.next) && (
                            <div className="mt-2 flex flex-wrap gap-2">
                                <Button
                                    asChild
                                    variant="outline"
                                    className="h-auto min-h-11 whitespace-normal"
                                >
                                    <a
                                        href={`/groups/${groupId}#meeting-schedule`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        {flow("openSchedule")}
                                    </a>
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => void checkSchedule()}
                                >
                                    {flow("checkSchedule")}
                                </Button>
                            </div>
                        )}
                    </div>
                )}
                <Button
                    type="button"
                    disabled={pending || blocked}
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
                    disabled={pending || blocked}
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
