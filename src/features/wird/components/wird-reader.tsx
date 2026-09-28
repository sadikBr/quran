"use client";

import { Check, MapPin } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import Ayah from "@/features/quran/components/ayah";
import QuranAudioQueue from "@/features/quran/components/quran-audio-queue";
import getAyahAudioStreams from "@/features/quran/helpers/get-ayah-audio-streams";
import { getArabicNumber } from "@/lib/arabic-numbers";
import { cn } from "@/lib/utils";
import type { WirdReaderGroup } from "../reader-types";
import updateWirdProgress from "../server/update-wird-progress";
import CompleteWirdButton from "./complete-wird-button";

export default function WirdReader({
    groups,
    startGlobalAyah,
    endGlobalAyah,
    initialProgress,
    showTranslation,
    continuousRecitation,
}: {
    groups: WirdReaderGroup[];
    startGlobalAyah: number;
    endGlobalAyah: number;
    initialProgress: number | null;
    showTranslation: boolean;
    continuousRecitation: boolean;
}) {
    function progressNumber(ayah: WirdReaderGroup["ayahs"][number]) {
        return ayah.hafsGlobalNumber ?? ayah.number;
    }
    const locale = useLocale();
    const t = useTranslations("Wird.reader");
    const [progress, setProgress] = useState(initialProgress);
    const [savingAyah, setSavingAyah] = useState<number | null>(null);
    const totalAyahs = endGlobalAyah - startGlobalAyah + 1;
    const completedAyahs = progress
        ? Math.max(0, progress - startGlobalAyah + 1)
        : 0;
    const percentage = Math.min(
        100,
        Math.round((completedAyahs / totalAyahs) * 100),
    );
    const nextAyah = Math.min(
        (progress ?? startGlobalAyah - 1) + 1,
        endGlobalAyah,
    );
    const [initialScrollTarget] = useState(nextAyah);
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
        const target = document.getElementById(`ayah-${initialScrollTarget}`);
        if (!target) return;

        const frame = window.requestAnimationFrame(() => {
            target.scrollIntoView({ block: "center", behavior: "auto" });
        });
        return () => window.cancelAnimationFrame(frame);
    }, [initialScrollTarget]);

    async function saveProgress(globalAyahNumber: number) {
        setSavingAyah(globalAyahNumber);
        const result = await updateWirdProgress({ globalAyahNumber });
        setSavingAyah(null);

        if (!result.success) {
            toast.error(t("saveError"));
            return;
        }

        setProgress(globalAyahNumber);
        toast.success(t("saved"));
    }

    return (
        <div className="mx-auto w-full max-w-4xl px-3 pb-[max(5rem,env(safe-area-inset-bottom))] sm:px-5">
            <section className="sticky top-14 z-20 -mx-3 border-border/45 border-y bg-background/92 px-3 shadow-[0_14px_32px_-30px_hsl(var(--foreground)/0.55)] backdrop-blur-xl sm:-mx-5 sm:px-5">
                <div className="flex min-h-16 items-center justify-between gap-3 py-2">
                    <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                        <strong
                            className="shrink-0 text-lg font-semibold text-primary tabular-nums sm:text-xl"
                            dir="ltr"
                        >
                            {percentage}%
                        </strong>
                        <span className="h-7 w-px bg-border/60" />
                        <div className="min-w-0">
                            <p className="text-[0.68rem] font-semibold tracking-[0.12em] text-primary uppercase">
                                {t("progress")}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-muted-foreground sm:text-sm">
                                {t("progressCount", {
                                    completed: completedAyahs,
                                    total: totalAyahs,
                                })}
                            </p>
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                        {audioQueue.length > 0 && (
                            <QuranAudioQueue
                                queue={audioQueue}
                                continuousRecitation={continuousRecitation}
                                showReadAll
                                scope="wird"
                                embedded
                                className="shrink-0"
                            />
                        )}
                    </div>
                </div>
                <div
                    role="progressbar"
                    aria-label={t("progressSummary", {
                        completed: completedAyahs,
                        total: totalAyahs,
                        percentage,
                    })}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={percentage}
                    className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden bg-muted/70"
                >
                    <div
                        className="h-full bg-primary transition-[width] duration-500"
                        style={{ width: `${percentage}%` }}
                    />
                </div>
            </section>

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
                                    const ayahProgressNumber =
                                        progressNumber(ayah);
                                    const isReached =
                                        progress !== null &&
                                        ayahProgressNumber <= progress;
                                    const isSavedPosition =
                                        progress === ayahProgressNumber;
                                    const isNext = (
                                        ayah.hafsGlobalNumbers ?? [
                                            ayahProgressNumber,
                                        ]
                                    ).includes(nextAyah);
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
                                        <article
                                            data-wird-ayah={ayahProgressNumber}
                                            key={`${group.surah.number}-${ayah.numberInSurah}-${ayah.audioNumber ?? ayah.number}`}
                                            className={cn(
                                                "relative overflow-hidden rounded-2xl px-4 py-5 transition-colors sm:px-6",
                                                isNext
                                                    ? "bg-primary/[0.07] ring-1 ring-primary/15"
                                                    : "bg-muted/25",
                                            )}
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
                                                <p className="mt-4 border-border/60 border-t pt-4 text-sm leading-7 text-muted-foreground">
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
                                                        savingAyah ===
                                                        ayahProgressNumber
                                                    }
                                                    onClick={() =>
                                                        saveProgress(
                                                            ayahProgressNumber,
                                                        )
                                                    }
                                                    aria-pressed={
                                                        isSavedPosition
                                                    }
                                                    className={cn(
                                                        "gap-2 rounded-full",
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
                                        </article>
                                    );
                                })}
                            </div>
                        </section>
                    );
                })}
            </div>

            <section className="mt-12 flex flex-col items-center border-border/70 border-t pt-8 text-center">
                <p className="max-w-md text-sm leading-6 text-muted-foreground">
                    {t("finishDescription")}
                </p>
                <div className="mt-5">
                    <CompleteWirdButton />
                </div>
            </section>
        </div>
    );
}
