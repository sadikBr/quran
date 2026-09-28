"use client";

import {
    Check,
    CheckCircle2,
    Eye,
    EyeOff,
    LoaderCircle,
    MapPin,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import Ayah from "@/features/quran/components/ayah";
import QuranAudioQueue from "@/features/quran/components/quran-audio-queue";
import getAyahAudioStreams from "@/features/quran/helpers/get-ayah-audio-streams";
import { getArabicNumber } from "@/lib/arabic-numbers";
import { cn } from "@/lib/utils";
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
    const [progress, setProgress] = useState(assignment.progress);
    const [status, setStatus] = useState(assignment.status);
    const [isSubmitting, setIsSubmitting] = useState(false);
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
    const completedAyahs = progressIndex + 1;
    const percentage = ayahs.length
        ? Math.round((completedAyahs / ayahs.length) * 100)
        : 0;
    const reachedEnd =
        progress?.surahNumber === assignment.end.surahNumber &&
        progress?.ayahNumber === assignment.end.ayahNumber;
    const next = ayahs[Math.min(completedAyahs, ayahs.length - 1)];
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
        setSavingReference(reference);
        const result = await updatePracticeProgress({
            assignmentId: assignment.id,
            ...reference,
        });
        setSavingReference(null);

        if (!result.success) {
            toast.error(t("saveError"));
            return;
        }

        setProgress(reference);
        if (status === "submitted") setStatus("in_progress");
        toast.success(t(result.completed ? "rangeReached" : "saved"));
    }

    async function submitForReview() {
        setIsSubmitting(true);
        const result = await submitPracticeAssignment({
            assignmentId: assignment.id,
        });
        setIsSubmitting(false);
        if (!result.success) {
            toast.error(t("submitError"));
            return;
        }
        setStatus("submitted");
        toast.success(t("submitted"));
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
        <div className="mx-auto w-full max-w-4xl px-3 pb-[max(5rem,env(safe-area-inset-bottom))] sm:px-4">
            <section className="sticky top-16 z-20 -mx-3 border-border/50 border-b bg-background/92 px-3 py-4 backdrop-blur-md sm:-mx-4 sm:px-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">
                            {t(`kinds.${assignment.kind}`)}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {t("progressSummary", {
                                completed: completedAyahs,
                                total: ayahs.length,
                                percentage,
                            })}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            size="sm"
                            variant={hideText ? "secondary" : "ghost"}
                            className="rounded-full"
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
                            {t(hideText ? "showText" : "hideText")}
                        </Button>
                        {audioQueue.length > 0 && (
                            <QuranAudioQueue
                                queue={audioQueue}
                                continuousRecitation={continuousRecitation}
                                showReadAll
                                scope="practice"
                            />
                        )}
                    </div>
                </div>
                <div className="mt-3 h-1 overflow-hidden rounded-full bg-muted">
                    <div
                        className="h-full rounded-full bg-primary transition-[width] duration-500"
                        style={{ width: `${percentage}%` }}
                    />
                </div>
            </section>

            {assignment.source === "group" && reachedEnd && (
                <section className="mt-6 rounded-2xl bg-primary/[0.08] p-5 text-center ring-1 ring-primary/15 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:text-start">
                    <div>
                        <div className="flex items-center justify-center gap-2 text-sm font-semibold text-primary sm:justify-start">
                            <CheckCircle2 className="size-4" />
                            {t("assignmentReached")}
                        </div>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            {t(
                                status === "submitted"
                                    ? "awaitingReview"
                                    : "submitDescription",
                            )}
                        </p>
                    </div>
                    {status !== "submitted" && (
                        <Button
                            type="button"
                            disabled={isSubmitting}
                            onClick={submitForReview}
                            className="mt-4 w-full rounded-xl sm:mt-0 sm:w-auto sm:shrink-0"
                        >
                            {isSubmitting && (
                                <LoaderCircle className="size-4 animate-spin" />
                            )}
                            {t(isSubmitting ? "submitting" : "submitForReview")}
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
                        <section key={group.surah.number}>
                            <div className="mb-6 flex items-center gap-4">
                                <span className="h-px flex-1 bg-primary/20" />
                                <div className="text-center">
                                    <p className="surah-name text-3xl leading-none text-primary">
                                        {getArabicNumber(group.surah.number)}
                                    </p>
                                    <h2 className="mt-1 text-sm font-semibold">
                                        {surahName}
                                    </h2>
                                </div>
                                <span className="h-px flex-1 bg-primary/20" />
                            </div>

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
                                        <article
                                            id={`practice-${reference.surahNumber}-${reference.ayahNumber}`}
                                            key={key}
                                            className={cn(
                                                "relative overflow-hidden rounded-2xl px-4 py-5 transition-colors sm:px-6",
                                                isNext
                                                    ? "bg-primary/[0.07] ring-1 ring-primary/15"
                                                    : "bg-muted/25",
                                            )}
                                        >
                                            <div className="relative min-h-24">
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
                                                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                                                    <p className="mt-4 border-border/60 border-t pt-4 text-sm leading-7 text-muted-foreground">
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
                                                        savingReference?.surahNumber ===
                                                            reference.surahNumber &&
                                                        savingReference?.ayahNumber ===
                                                            reference.ayahNumber
                                                    }
                                                    onClick={() =>
                                                        saveProgress(reference)
                                                    }
                                                    className="gap-2 rounded-full"
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
                                        </article>
                                    );
                                })}
                            </div>
                        </section>
                    );
                })}
            </div>
        </div>
    );
}
