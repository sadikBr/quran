"use client";

import { Check, MapPin } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import Ayah from "@/features/quran/components/ayah";
import GuidedReader, {
    GuidedReaderSurah,
    GuidedReaderVerse,
} from "@/features/quran/components/guided-reader";
import getAyahAudioStreams from "@/features/quran/helpers/get-ayah-audio-streams";
import { cn } from "@/lib/utils";
import { wirdProgress } from "../progress";
import { type ProgressSave, readProgressDraft } from "../progress-save";
import type { WirdReaderGroup } from "../reader-types";
import updateWirdProgress from "../server/update-wird-progress";
import type { DailyWird } from "../types";
import CompleteWirdButton from "./complete-wird-button";

export default function WirdReader({
    groups,
    startGlobalAyah,
    endGlobalAyah,
    initialProgress,
    initialPosition,
    initialRevision,
    targetDate,
    draftKey,
    riwayah,
    showTranslation,
    continuousRecitation,
}: {
    groups: WirdReaderGroup[];
    startGlobalAyah: number;
    endGlobalAyah: number;
    initialProgress: number | null;
    initialPosition: DailyWird["progressVerse"];
    initialRevision: string;
    targetDate: string;
    draftKey: string;
    riwayah: "hafs" | "warsh";
    showTranslation: boolean;
    continuousRecitation: boolean;
}) {
    function progressNumber(ayah: WirdReaderGroup["ayahs"][number]) {
        return Math.min(
            endGlobalAyah,
            Math.max(...(ayah.hafsGlobalNumbers ?? [ayah.number])),
        );
    }
    const locale = useLocale();
    const t = useTranslations("Wird.reader");
    const [progress, setProgress] = useState(initialProgress);
    const [position, setPosition] = useState(initialPosition);
    const revision = useRef(initialRevision);
    const [pending, setPending] = useState<ProgressSave | null>(null);
    const [saveStatus, setSaveStatus] = useState<
        "idle" | "saving" | "saved" | "error" | "conflict"
    >("idle");
    const [retained, setRetained] = useState(false);
    const discardRequested = useRef(false);
    useEffect(() => {
        try {
            const draft = readProgressDraft(
                localStorage.getItem(draftKey),
                startGlobalAyah,
                endGlobalAyah,
                riwayah,
            );
            if (draft) {
                setPending(draft);
                setRetained(true);
                setSaveStatus(
                    draft.expectedRevision === initialRevision
                        ? "error"
                        : "conflict",
                );
            }
        } catch {
            /* Storage may be unavailable; in-memory retry still works. */
        }
    }, [draftKey, startGlobalAyah, endGlobalAyah, riwayah, initialRevision]);
    useEffect(() => {
        if (!pending) return;
        const warn = (event: BeforeUnloadEvent) => {
            if (!discardRequested.current) {
                event.preventDefault();
                event.returnValue = "";
            }
        };
        window.addEventListener("beforeunload", warn);
        return () => window.removeEventListener("beforeunload", warn);
    }, [pending]);
    const [savingAyah, setSavingAyah] = useState<number | null>(null);
    const saveInFlight = useRef(false);
    const summary = wirdProgress(groups, progress, position, riwayah);
    const totalAyahs = summary.total;
    const completedAyahs = summary.completed;
    const percentage = Math.min(
        100,
        Math.round((completedAyahs / Math.max(1, totalAyahs)) * 100),
    );
    const [initialScrollTarget] = useState(
        Math.min(summary.completed, Math.max(0, summary.total - 1)),
    );
    const audioQueue = useMemo(
        () =>
            groups
                .flatMap((group) => group.ayahs)
                .map((ayah) => ({
                    ayahNumber: ayah.audioNumber ?? ayah.number,
                    streams: getAyahAudioStreams(ayah),
                }))
                .filter((item) => item.streams.length > 0),
        [groups],
    );

    useEffect(() => {
        const target = document.querySelector<HTMLElement>(
            `[data-wird-resume="true"]`,
        );
        if (!target) return;

        const frame = window.requestAnimationFrame(() => {
            target.scrollIntoView({ block: "center", behavior: "auto" });
        });
        return () => window.cancelAnimationFrame(frame);
    }, []);

    async function saveProgress(
        globalAyahNumber: number,
        surahNumber: number,
        ayahNumber: number,
    ) {
        if (saveInFlight.current || pending) return;
        const draft: ProgressSave = {
            globalAyahNumber,
            surahNumber,
            ayahNumber,
            start: startGlobalAyah,
            end: endGlobalAyah,
            expectedRevision: revision.current,
            riwayah,
        };
        setPending(draft);
        try {
            const existing = readProgressDraft(
                localStorage.getItem(draftKey),
                startGlobalAyah,
                endGlobalAyah,
                riwayah,
            );
            if (
                existing &&
                JSON.stringify(existing) !== JSON.stringify(draft)
            ) {
                // Do not replace another tab's unsaved attempt.
                setRetained(false);
            } else {
                localStorage.setItem(draftKey, JSON.stringify(draft));
                setRetained(true);
            }
        } catch {
            setRetained(false);
        }
        await attemptSave(draft);
    }

    async function attemptSave(draft: ProgressSave) {
        if (saveInFlight.current) return;
        saveInFlight.current = true;
        setSavingAyah(draft.globalAyahNumber);
        setSaveStatus("saving");
        try {
            const result = await updateWirdProgress(draft);
            if (!result.success) {
                setSaveStatus(
                    result.message === "conflict" ? "conflict" : "error",
                );
                return;
            }
            revision.current = result.revision;
            setProgress(draft.globalAyahNumber);
            setPosition({
                riwayah,
                surahNumber: draft.surahNumber,
                ayahNumber: draft.ayahNumber,
            });
            setPending(null);
            setSaveStatus("saved");
            toast.success(t("saved"), { id: "wird-progress-saved" });
            try {
                if (localStorage.getItem(draftKey) === JSON.stringify(draft))
                    localStorage.removeItem(draftKey);
            } catch {
                /* A leftover draft will be checked against the server revision. */
            }
        } catch {
            setSaveStatus("error");
        } finally {
            saveInFlight.current = false;
            setSavingAyah(null);
        }
    }

    return (
        <GuidedReader
            percentage={percentage}
            title={t("progress")}
            progressLabel={
                completedAyahs === 0
                    ? t("notStarted")
                    : t("progressCount", {
                          completed: completedAyahs,
                          total: totalAyahs,
                      })
            }
            progressSummary={t("progressSummary", {
                completed: completedAyahs,
                total: totalAyahs,
                percentage,
            })}
            queue={audioQueue}
            continuousRecitation={continuousRecitation}
            scope="wird"
        >
            {saveStatus !== "idle" && saveStatus !== "saved" && (
                <section
                    className="sticky top-36 z-20 mt-4 rounded-xl border border-border bg-card p-3 text-sm shadow-sm"
                    aria-label={t("saveStatusLabel")}
                >
                    <output className="block" aria-live="polite">
                        {t(
                            saveStatus === "saving"
                                ? "saving"
                                : saveStatus === "conflict"
                                  ? "saveConflict"
                                  : "saveError",
                        )}
                    </output>
                    {pending && saveStatus !== "saving" && (
                        <>
                            <p className="mt-1 text-xs text-muted-foreground">
                                {t("pendingPosition", {
                                    surah: String(pending.surahNumber),
                                    ayah: String(pending.ayahNumber),
                                })}{" "}
                                {t(
                                    retained
                                        ? "draftRetained"
                                        : "draftMemoryOnly",
                                )}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                {saveStatus === "error" && (
                                    <Button
                                        size="sm"
                                        onClick={() => attemptSave(pending)}
                                    >
                                        {t("retrySave")}
                                    </Button>
                                )}
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                        discardRequested.current = true;
                                        try {
                                            if (
                                                localStorage.getItem(
                                                    draftKey,
                                                ) === JSON.stringify(pending)
                                            )
                                                localStorage.removeItem(
                                                    draftKey,
                                                );
                                        } catch {
                                            /* No storage access. */
                                        }
                                        setPending(null);
                                        window.location.reload();
                                    }}
                                >
                                    {t("useLatest")}
                                </Button>
                            </div>
                        </>
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
                                    const ayahProgressNumber =
                                        progressNumber(ayah);
                                    const index = summary.verses.findIndex(
                                        (item) => item.ayah === ayah,
                                    );
                                    const isReached = index < completedAyahs;
                                    const isSavedPosition =
                                        index === completedAyahs - 1;
                                    const isNext = index === completedAyahs;
                                    const translation = (
                                        ayah.hafsGlobalNumbers ?? [
                                            ayahProgressNumber,
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
                                            data-wird-ayah={ayahProgressNumber}
                                            data-wird-resume={
                                                index === initialScrollTarget ||
                                                undefined
                                            }
                                            key={`${group.surah.number}-${ayah.numberInSurah}-${ayah.audioNumber ?? ayah.number}`}
                                        >
                                            <div
                                                dir="rtl"
                                                lang="ar"
                                                className="text-center leading-[2.5]"
                                            >
                                                <Ayah
                                                    ayah={ayah}
                                                    surahNumber={
                                                        group.surah.number
                                                    }
                                                />
                                            </div>
                                            {showTranslation && translation && (
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
                                                        isReached
                                                            ? "ghost"
                                                            : "outline"
                                                    }
                                                    disabled={
                                                        savingAyah !== null ||
                                                        pending !== null
                                                    }
                                                    onClick={() =>
                                                        saveProgress(
                                                            ayahProgressNumber,
                                                            group.surah.number,
                                                            ayah.numberInSurah,
                                                        )
                                                    }
                                                    aria-pressed={
                                                        isSavedPosition
                                                    }
                                                    className={cn(
                                                        "min-h-11 gap-2 rounded-xl",
                                                        isSavedPosition &&
                                                            "bg-primary/10 text-primary hover:bg-primary/12",
                                                    )}
                                                >
                                                    {isReached ? (
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
                                                    {savingAyah ===
                                                    ayahProgressNumber
                                                        ? t("saving")
                                                        : isSavedPosition
                                                          ? t("savedHere")
                                                          : isReached
                                                            ? t("reached")
                                                            : t("stopHere")}
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

            <section className="mt-12 flex flex-col items-center border-border/70 border-t pt-8 text-center">
                <p className="max-w-md text-sm leading-6 text-muted-foreground">
                    {t("finishDescription")}
                </p>
                <div className="mt-5">
                    <CompleteWirdButton
                        disabled={pending !== null}
                        portion={{
                            targetDate,
                            start: startGlobalAyah,
                            end: endGlobalAyah,
                            revision: revision.current,
                        }}
                    />
                </div>
            </section>
        </GuidedReader>
    );
}
