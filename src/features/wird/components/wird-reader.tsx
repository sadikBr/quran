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
    const saveInFlight = useRef(false);
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
        const target = document.querySelector<HTMLElement>(
            `[data-wird-resume="true"]`,
        );
        if (!target) return;

        const frame = window.requestAnimationFrame(() => {
            target.scrollIntoView({ block: "center", behavior: "auto" });
        });
        return () => window.cancelAnimationFrame(frame);
    }, []);

    async function saveProgress(globalAyahNumber: number) {
        if (saveInFlight.current) return;
        saveInFlight.current = true;
        setSavingAyah(globalAyahNumber);
        try {
            const result = await updateWirdProgress({ globalAyahNumber });
            if (!result.success) {
                toast.error(t("saveError"));
                return;
            }
            setProgress(globalAyahNumber);
            toast.success(t("saved"));
        } catch {
            toast.error(t("saveError"));
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
                        >
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
                                        <GuidedReaderVerse
                                            active={isNext}
                                            data-wird-ayah={ayahProgressNumber}
                                            data-wird-resume={
                                                (
                                                    ayah.hafsGlobalNumbers ?? [
                                                        ayahProgressNumber,
                                                    ]
                                                ).includes(
                                                    initialScrollTarget,
                                                ) || undefined
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
                                                        savingAyah !== null
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
                    <CompleteWirdButton />
                </div>
            </section>
        </GuidedReader>
    );
}
