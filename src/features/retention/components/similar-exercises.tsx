"use client";
import { Eye, Repeat2, Shuffle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRef, useState } from "react";
import PageHeading from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import QuranText from "@/features/quran/components/quran-text";
import { loadSimilarExercise } from "../server/similar";
import { differingWords, opening, type SimilarExercise } from "../similar";
import type { ExerciseVerse } from "../types";
import { fieldClass, type ReferenceOption } from "./mistake-editor";

export default function SimilarExercises({
    candidates,
    riwayah,
}: {
    candidates: ReferenceOption[];
    riwayah: "hafs" | "warsh";
}) {
    const t = useTranslations("Memorization.retention"),
        locale = useLocale();
    const [surah, setSurah] = useState(candidates[0]?.surahNumber ?? 1);
    const [ayah, setAyah] = useState(candidates[0]?.ayahNumber ?? 1);
    const [exercise, setExercise] = useState<SimilarExercise | null>(null);
    const [revealed, setRevealed] = useState(false),
        [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inFlight = useRef(false),
        serial = useRef(0);
    const surahs = [
        ...new Map(candidates.map((v) => [v.surahNumber, v.label])).entries(),
    ];
    const name = (v: ExerciseVerse) =>
        locale === "ar" ? v.surahName : v.englishName;
    async function load(random = false) {
        if (inFlight.current || !candidates.length) return;
        inFlight.current = true;
        setBusy(true);
        setError(null);
        setExercise(null);
        setRevealed(false);
        const current = ++serial.current;
        const selected = random
            ? candidates[Math.floor(Math.random() * candidates.length)]
            : { surahNumber: surah, ayahNumber: ayah };
        setSurah(selected.surahNumber);
        setAyah(selected.ayahNumber);
        try {
            const result = await loadSimilarExercise({ ...selected, riwayah });
            if (current !== serial.current) return;
            if (result.success) setExercise(result.exercise);
            else
                setError(
                    t(
                        result.reason === "empty"
                            ? "noSimilarKnown"
                            : result.reason === "unknown"
                              ? "gridChanged"
                              : "studyUnavailable",
                    ),
                );
        } catch {
            setError(t("studyUnavailable"));
        } finally {
            inFlight.current = false;
            setBusy(false);
        }
    }
    return (
        <div className="space-y-6">
            <PageHeading
                title={t("similar")}
                description={t("similarDescription")}
                icon={<Repeat2 />}
            />
            {!candidates.length ? (
                <div className="app-card p-8 text-center text-sm leading-7 text-muted-foreground">
                    {t("noSimilarCandidates")}
                </div>
            ) : (
                <section className="app-card p-5 sm:p-6">
                    <div className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_7rem_auto_auto]">
                        <label
                            htmlFor="similar-surah"
                            className="min-w-0 text-sm"
                        >
                            {t("surah")}
                            <select
                                id="similar-surah"
                                disabled={busy}
                                value={surah}
                                className={fieldClass}
                                onChange={(e) => {
                                    const n = Number(e.target.value);
                                    setSurah(n);
                                    setAyah(
                                        candidates.find(
                                            (v) => v.surahNumber === n,
                                        )?.ayahNumber ?? 1,
                                    );
                                }}
                            >
                                {surahs.map(([n, label]) => (
                                    <option key={n} value={n}>
                                        {label}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label htmlFor="similar-ayah" className="text-sm">
                            {t("ayah")}
                            <select
                                id="similar-ayah"
                                disabled={busy}
                                value={ayah}
                                className={fieldClass}
                                onChange={(e) =>
                                    setAyah(Number(e.target.value))
                                }
                            >
                                {candidates
                                    .filter((v) => v.surahNumber === surah)
                                    .map((v) => (
                                        <option
                                            key={v.ayahNumber}
                                            value={v.ayahNumber}
                                        >
                                            {v.ayahNumber}
                                        </option>
                                    ))}
                            </select>
                        </label>
                        <Button
                            type="button"
                            disabled={busy}
                            className="min-h-11 rounded-xl"
                            onClick={() => load()}
                        >
                            {t(busy ? "loading" : "startExercise")}
                        </Button>
                        <Button
                            type="button"
                            disabled={busy}
                            variant="outline"
                            className="min-h-11 rounded-xl"
                            onClick={() => load(true)}
                        >
                            <Shuffle className="size-4" />
                            {t("random")}
                        </Button>
                    </div>
                    {error && (
                        <p
                            aria-live="polite"
                            className="mt-4 rounded-xl bg-muted p-4 text-sm leading-7"
                        >
                            {error}
                        </p>
                    )}
                </section>
            )}
            {exercise && (
                <section className="app-card overflow-hidden p-5 sm:p-8">
                    <p className="text-sm font-semibold text-primary">
                        {name(exercise.source)} ·{" "}
                        {t("ayahNumber", {
                            number: exercise.source.ayahNumber,
                        })}{" "}
                        · {t(riwayah)}
                    </p>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">
                        {t("recallPrompt")}
                    </p>
                    <p
                        dir="rtl"
                        lang="ar"
                        data-riwayah={riwayah}
                        className="ayah assignment-review-quran quran-reader-text my-6 text-center leading-[2.5]"
                    >
                        <QuranText
                            text={
                                revealed
                                    ? exercise.source.text
                                    : opening(exercise.source.text)
                            }
                        />
                        {!revealed && " …"}
                    </p>
                    <Button
                        type="button"
                        variant="outline"
                        className="min-h-11 rounded-xl"
                        aria-pressed={revealed}
                        onClick={() => setRevealed(!revealed)}
                    >
                        <Eye className="size-4" />
                        {t(revealed ? "hideAnswer" : "revealDifferences")}
                    </Button>
                    {revealed && (
                        <div className="mt-6 space-y-4 border-t border-border/60 pt-6">
                            <h2 className="font-semibold">
                                {t("compareKnown")}
                            </h2>
                            <p className="text-xs leading-6 text-muted-foreground">
                                {t("highlightHint")}
                            </p>
                            <div className="grid gap-4 lg:grid-cols-2">
                                {exercise.alternatives.map((v) => (
                                    <article
                                        key={`${v.surahNumber}:${v.ayahNumber}`}
                                        className="min-w-0 rounded-2xl border bg-background/60 p-4 sm:p-5"
                                    >
                                        <h3 className="text-sm font-medium">
                                            {name(v)} ·{" "}
                                            {t("ayahNumber", {
                                                number: v.ayahNumber,
                                            })}
                                        </h3>
                                        <p
                                            dir="rtl"
                                            lang="ar"
                                            data-riwayah={riwayah}
                                            className="ayah assignment-review-quran quran-reader-text mt-4 text-center leading-[2.5]"
                                        >
                                            {differingWords(
                                                exercise.source.text,
                                                v.text,
                                            ).map((word, index) => (
                                                <span
                                                    key={`${index}:${word.word}`}
                                                >
                                                    {word.different ? (
                                                        <mark className="rounded bg-primary/15 px-0.5 text-foreground underline decoration-primary/50 underline-offset-8">
                                                            {word.word}
                                                        </mark>
                                                    ) : (
                                                        word.word
                                                    )}{" "}
                                                </span>
                                            ))}
                                        </p>
                                    </article>
                                ))}
                            </div>
                            <a
                                className="inline-flex min-h-11 items-center text-sm text-primary underline underline-offset-4"
                                href={exercise.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                {t("source")}
                            </a>
                        </div>
                    )}
                </section>
            )}
        </div>
    );
}
