"use client";

import {
    Check,
    CheckCircle2,
    Eye,
    EyeOff,
    LoaderCircle,
    MapPin,
} from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import ReviewMethodLabel from "@/features/groups/components/review-method-label";
import { confirmPersonalMemorization } from "@/features/memorization/server/record-actions";
import Ayah from "@/features/quran/components/ayah";
import GuidedReader, {
    GuidedReaderSurah,
    GuidedReaderVerse,
} from "@/features/quran/components/guided-reader";
import getAyahAudioStreams from "@/features/quran/helpers/get-ayah-audio-streams";
import { cn } from "@/lib/utils";
import { preparedAyahs } from "../preparation-progress";
import type { PracticeReaderGroup } from "../reader-types";
import submitPracticeAssignment from "../server/submit-practice-assignment";
import updatePracticeProgress from "../server/update-practice-progress";
import type { PracticeAssignment, QuranReference } from "../types";
import { referenceOrder } from "../types";

export default function PracticeReader({
    assignment,
    groups,
    showTranslation,
    continuousRecitation,
}: {
    assignment: PracticeAssignment;
    groups: PracticeReaderGroup[];
    showTranslation: boolean;
    continuousRecitation: boolean;
}) {
    const locale = useLocale();
    const t = useTranslations("Practice.reader");
    const flow = useTranslations("Groups.flow");
    const memoryT = useTranslations("Memorization.personal");
    const [confirmMemory, setConfirmMemory] = useState(false);
    const [confirmReady, setConfirmReady] = useState(false);
    const [progress, setProgress] = useState(assignment.progress);
    const [status, setStatus] = useState(assignment.status);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const mutationInFlight = useRef(false);
    const [savingReference, setSavingReference] =
        useState<QuranReference | null>(null);
    const [hideText, setHideText] = useState(assignment.kind === "revision");
    const [revealedAyahs, setRevealedAyahs] = useState<Set<string>>(
        () => new Set(),
    );
    const ayahs = useMemo(
        () =>
            groups.flatMap((group) =>
                group.ayahs.map((ayah) => ({
                    ayah,
                    surahNumber: group.surah.number,
                })),
            ),
        [groups],
    );
    const progressIndex = progress
        ? ayahs.findIndex(
              ({ ayah, surahNumber }) =>
                  surahNumber === progress.surahNumber &&
                  ayah.numberInSurah === progress.ayahNumber,
          )
        : -1;
    const completedAyahs = preparedAyahs(
        status,
        ayahs.length,
        progressIndex + 1,
    );
    const percentage = ayahs.length
        ? Math.round((completedAyahs / ayahs.length) * 100)
        : 0;
    const reachedEnd =
        progress?.surahNumber === assignment.end.surahNumber &&
        progress?.ayahNumber === assignment.end.ayahNumber;
    const next = ayahs[Math.min(progressIndex + 1, ayahs.length - 1)];
    const audioQueue = useMemo(
        () =>
            ayahs
                .map(({ ayah }) => ({
                    ayahNumber: ayah.audioNumber ?? ayah.number,
                    streams: getAyahAudioStreams(ayah),
                }))
                .filter((item) => item.streams.length > 0),
        [ayahs],
    );

    useEffect(() => {
        if (!next) return;
        const target = document.getElementById(
            `practice-${next.surahNumber}-${next.ayah.numberInSurah}`,
        );
        if (!target) return;

        const frame = window.requestAnimationFrame(() => {
            target.scrollIntoView({ block: "center", behavior: "auto" });
        });
        return () => window.cancelAnimationFrame(frame);
    }, [next]);

    async function saveProgress(reference: QuranReference) {
        if (mutationInFlight.current || status === "completed") return;
        mutationInFlight.current = true;
        setSavingReference(reference);
        try {
            const result = await updatePracticeProgress({
                assignmentId: assignment.id,
                ...reference,
            });

            if (!result.success) {
                toast.error(t("saveError"));
                return;
            }

            setProgress(reference);
            toast.success(t(result.completed ? "rangeReached" : "saved"));
        } catch {
            toast.error(t("saveError"));
        } finally {
            setSavingReference(null);
            mutationInFlight.current = false;
        }
    }

    async function submitForReview() {
        if (mutationInFlight.current) return;
        mutationInFlight.current = true;
        setIsSubmitting(true);
        try {
            const result = await submitPracticeAssignment({
                assignmentId: assignment.id,
                confirmed: true,
            });
            if (!result.success) {
                toast.error(t("submitError"));
                return;
            }
            setStatus("submitted");
            setConfirmReady(false);
            toast.success(t("submitted"));
        } catch {
            toast.error(t("submitError"));
        } finally {
            setIsSubmitting(false);
            mutationInFlight.current = false;
        }
    }

    async function confirmMemorization() {
        if (mutationInFlight.current) return;
        mutationInFlight.current = true;
        setIsSubmitting(true);
        try {
            const result = await confirmPersonalMemorization({
                assignmentId: assignment.id,
                riwayah: assignment.riwayah,
                startSurahNumber: assignment.start.surahNumber,
                startAyahNumber: assignment.start.ayahNumber,
                endSurahNumber: assignment.end.surahNumber,
                endAyahNumber: assignment.end.ayahNumber,
                confirmed: true,
            });
            if (!result.success) {
                toast.error(memoryT("failed"));
                return;
            }
            setStatus("completed");
            setConfirmMemory(false);
            toast.success(memoryT("saved"));
        } catch {
            toast.error(memoryT("failed"));
        } finally {
            mutationInFlight.current = false;
            setIsSubmitting(false);
        }
    }

    function toggleReveal(key: string) {
        setRevealedAyahs((current) => {
            const nextValues = new Set(current);
            if (nextValues.has(key)) nextValues.delete(key);
            else nextValues.add(key);
            return nextValues;
        });
    }

    return (
        <GuidedReader
            percentage={percentage}
            title={t(`kinds.${assignment.kind}`)}
            progressLabel={
                completedAyahs === 0
                    ? t("notStarted")
                    : t("progressCount", {
                          completed: completedAyahs,
                          total: ayahs.length,
                      })
            }
            progressSummary={t("progressSummary", {
                completed: completedAyahs,
                total: ayahs.length,
                percentage,
            })}
            queue={audioQueue}
            continuousRecitation={continuousRecitation}
            scope="practice"
            controls={
                <Button
                    type="button"
                    size="icon"
                    variant={hideText ? "secondary" : "ghost"}
                    aria-label={t(hideText ? "showText" : "hideText")}
                    aria-pressed={hideText}
                    className="size-11 shrink-0 rounded-xl text-muted-foreground hover:bg-primary/10 hover:text-primary sm:w-auto sm:gap-1.5 sm:px-3"
                    onClick={() => {
                        setHideText((value) => !value);
                        setRevealedAyahs(new Set());
                    }}
                >
                    {hideText ? (
                        <Eye aria-hidden="true" className="size-4" />
                    ) : (
                        <EyeOff aria-hidden="true" className="size-4" />
                    )}
                    <span className="hidden sm:inline">
                        {t(hideText ? "showText" : "hideText")}
                    </span>
                </Button>
            }
        >
            <ConfirmationDialog
                open={confirmMemory}
                onOpenChange={setConfirmMemory}
                title={memoryT("confirmTitle")}
                description={memoryT("confirmDescription")}
                confirmLabel={memoryT("confirm")}
                cancelLabel={flow("cancel")}
                pending={isSubmitting}
                onConfirm={confirmMemorization}
            />
            <ReviewMethodLabel
                method={
                    status === "completed" && assignment.source === "personal"
                        ? "self"
                        : assignment.reviewMethod
                }
            />
            {assignment.source === "group" && assignment.reviewNote && (
                <section className="mt-6 rounded-2xl bg-primary/[0.07] px-5 py-4 ring-1 ring-primary/15">
                    <p className="text-xs font-semibold text-primary">
                        {t("feedbackTitle")}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {assignment.reviewNote}
                    </p>
                </section>
            )}

            <ConfirmationDialog
                open={confirmReady}
                onOpenChange={setConfirmReady}
                title={flow("readyTitle")}
                description={flow("readyDescription")}
                confirmLabel={flow("confirm")}
                cancelLabel={flow("cancel")}
                pending={isSubmitting}
                onConfirm={submitForReview}
            />
            {assignment.source === "group" && (
                <section className="mt-6 rounded-2xl bg-primary/[0.08] p-5 text-center ring-1 ring-primary/15 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:text-start">
                    <div>
                        <div className="flex items-center justify-center gap-2 text-sm font-semibold text-primary sm:justify-start">
                            <CheckCircle2 className="size-4" />
                            {status === "submitted"
                                ? flow("awaiting")
                                : reachedEnd
                                  ? t("assignmentReached")
                                  : flow("ready")}
                        </div>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            {status === "submitted"
                                ? t("awaitingReview")
                                : flow("readyHint")}
                        </p>
                    </div>
                    {status !== "submitted" && (
                        <Button
                            type="button"
                            disabled={isSubmitting || savingReference !== null}
                            onClick={() => setConfirmReady(true)}
                            className="mt-4 w-full rounded-xl sm:mt-0 sm:w-auto sm:shrink-0"
                        >
                            {isSubmitting && (
                                <LoaderCircle className="size-4 animate-spin" />
                            )}
                            {isSubmitting ? t("submitting") : flow("ready")}
                        </Button>
                    )}
                </section>
            )}

            <div className="mt-7 space-y-12">
                {groups.map((group) => {
                    const translationByAyah = new Map(
                        group.translatedAyahs.map((ayah) => [
                            ayah.number,
                            ayah.text,
                        ]),
                    );
                    const surahName =
                        locale === "ar"
                            ? group.surah.name
                            : group.surah.englishName;

                    return (
                        <GuidedReaderSurah
                            key={group.surah.number}
                            number={group.surah.number}
                            name={surahName}
                            ayahCount={group.surah.numberOfAyahs}
                        >
                            <div className="space-y-4">
                                {group.ayahs.map((ayah) => {
                                    const reference = {
                                        surahNumber: group.surah.number,
                                        ayahNumber: ayah.numberInSurah,
                                    };
                                    const key = `${reference.surahNumber}-${reference.ayahNumber}`;
                                    const reached =
                                        progress !== null &&
                                        referenceOrder(reference) <=
                                            referenceOrder(progress);
                                    const isNext =
                                        next?.surahNumber ===
                                            reference.surahNumber &&
                                        next.ayah.numberInSurah ===
                                            reference.ayahNumber;
                                    const isRevealed =
                                        !hideText || revealedAyahs.has(key);
                                    const translation = (
                                        ayah.hafsGlobalNumbers ?? [
                                            ayah.hafsGlobalNumber ??
                                                ayah.number,
                                        ]
                                    )
                                        .map((number) =>
                                            translationByAyah.get(number),
                                        )
                                        .filter(Boolean)
                                        .join(" ");

                                    return (
                                        <GuidedReaderVerse
                                            active={isNext}
                                            id={`practice-${reference.surahNumber}-${reference.ayahNumber}`}
                                            key={key}
                                        >
                                            <div className="relative min-h-16">
                                                <div
                                                    dir="rtl"
                                                    lang="ar"
                                                    className={cn(
                                                        "text-center leading-[2.5] transition-[filter,opacity] duration-200",
                                                        !isRevealed &&
                                                            "pointer-events-none opacity-15 blur-md select-none",
                                                    )}
                                                >
                                                    <Ayah
                                                        riwayah={
                                                            assignment.riwayah
                                                        }
                                                        ayah={ayah}
                                                        surahNumber={
                                                            group.surah.number
                                                        }
                                                        actionsHref={`/quran/ayah/${group.surah.number}/${ayah.numberInSurah}?practice=${assignment.id}`}
                                                    />
                                                </div>
                                                {!isRevealed && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            toggleReveal(key)
                                                        }
                                                        className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-xl text-sm font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                    >
                                                        <Eye
                                                            aria-hidden="true"
                                                            className="me-2 size-4"
                                                        />
                                                        {t("revealAyah", {
                                                            number: ayah.numberInSurah,
                                                        })}
                                                    </button>
                                                )}
                                            </div>
                                            {hideText && isRevealed && (
                                                <div className="mt-2 flex justify-center">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            toggleReveal(key)
                                                        }
                                                        className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                    >
                                                        <EyeOff
                                                            aria-hidden="true"
                                                            className="size-3.5"
                                                        />
                                                        {t("hideAyah", {
                                                            number: ayah.numberInSurah,
                                                        })}
                                                    </button>
                                                </div>
                                            )}
                                            {showTranslation &&
                                                translation &&
                                                isRevealed && (
                                                    <p
                                                        dir="auto"
                                                        className="mt-4 border-border/60 border-t pt-4 text-start text-sm leading-7 text-muted-foreground"
                                                    >
                                                        {translation}
                                                    </p>
                                                )}
                                            <div className="mt-4 flex justify-end">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant={
                                                        reached
                                                            ? "ghost"
                                                            : "outline"
                                                    }
                                                    disabled={
                                                        savingReference !==
                                                            null ||
                                                        isSubmitting ||
                                                        status === "completed"
                                                    }
                                                    onClick={() =>
                                                        saveProgress(reference)
                                                    }
                                                    className="min-h-11 gap-2 rounded-xl"
                                                >
                                                    {reached ? (
                                                        <Check
                                                            aria-hidden="true"
                                                            className="size-3.5"
                                                        />
                                                    ) : (
                                                        <MapPin
                                                            aria-hidden="true"
                                                            className="size-3.5"
                                                        />
                                                    )}
                                                    {reached
                                                        ? t("reached")
                                                        : t("markReached")}
                                                </Button>
                                            </div>
                                        </GuidedReaderVerse>
                                    );
                                })}
                            </div>
                        </GuidedReaderSurah>
                    );
                })}
            </div>
            {assignment.source === "personal" && (
                <section className="mt-6 space-y-3 rounded-2xl bg-primary/8 p-5 ring-1 ring-primary/15">
                    <h2 className="font-semibold">
                        {memoryT(status === "completed" ? "saved" : "title")}
                    </h2>
                    <p className="text-sm leading-7 text-muted-foreground">
                        {memoryT(
                            status === "completed" ? "completedHint" : "hint",
                        )}
                    </p>
                    {status !== "completed" && (
                        <Button
                            disabled={
                                !reachedEnd ||
                                isSubmitting ||
                                savingReference !== null
                            }
                            onClick={() => setConfirmMemory(true)}
                        >
                            {memoryT("confirm")}
                        </Button>
                    )}
                    <Link
                        href="/memorization"
                        className="block text-sm font-medium text-primary underline underline-offset-4"
                    >
                        {memoryT("map")}
                    </Link>
                </section>
            )}
        </GuidedReader>
    );
}
