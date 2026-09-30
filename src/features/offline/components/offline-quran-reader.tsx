"use client";

import { ChevronLeft, ChevronRight, CloudOff, Languages } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import AppLogo from "@/components/app-logo";
import AppPrimaryNav from "@/components/app-primary-nav";
import { Button } from "@/components/ui/button";
import { getArabicNumber } from "@/lib/arabic-numbers";
import { cn } from "@/lib/utils";
import type { OfflineQuranDataset } from "../types";

interface Labels {
    offline: string;
    title: string;
    description: string;
    surah: string;
    hafs: string;
    warsh: string;
    translation: string;
    backOnline: string;
    loading: string;
    unavailableTitle: string;
    unavailableDescription: string;
    previous: string;
    next: string;
    ayah: string;
    juz: string;
}

async function loadDataset(kind: "hafs" | "warsh" | "translation") {
    const response = await fetch(`/api/offline/quran/${kind}`);
    if (!response.ok) throw new Error(`Offline ${kind} data is unavailable.`);
    return (await response.json()) as OfflineQuranDataset;
}

function initialSurahNumber() {
    if (typeof window === "undefined") return 1;
    const pathMatch = window.location.pathname.match(/\/quran\/surah\/(\d+)/);
    const value = Number(
        pathMatch?.[1] ??
            new URLSearchParams(window.location.search).get("surah") ??
            localStorage.getItem("quran-offline-last-surah"),
    );
    return Number.isInteger(value) && value >= 1 && value <= 114 ? value : 1;
}

export default function OfflineQuranReader({
    language,
    initialRiwayah,
    initialShowTranslation,
    labels,
}: {
    language: "ar" | "en";
    initialRiwayah: "hafs" | "warsh";
    initialShowTranslation: boolean;
    labels: Labels;
}) {
    const [datasets, setDatasets] = useState<{
        hafs: OfflineQuranDataset;
        warsh: OfflineQuranDataset;
        translation: OfflineQuranDataset;
    } | null>(null);
    const [failed, setFailed] = useState(false);
    const [riwayah, setRiwayah] = useState(initialRiwayah);
    const [showTranslation, setShowTranslation] = useState(
        initialShowTranslation,
    );
    const [surahNumber, setSurahNumber] = useState(initialSurahNumber);

    useEffect(() => {
        Promise.all([
            loadDataset("hafs"),
            loadDataset("warsh"),
            loadDataset("translation"),
        ])
            .then(([hafs, warsh, translation]) => {
                setDatasets({ hafs, warsh, translation });
                const pageMatch =
                    window.location.pathname.match(/\/quran\/page\/(\d+)/);
                const requestedPage = Number(pageMatch?.[1]);
                if (Number.isInteger(requestedPage)) {
                    const matchingSurah = hafs.surahs.find((item) =>
                        item.ayahs.some((ayah) => ayah.page === requestedPage),
                    );
                    if (matchingSurah) setSurahNumber(matchingSurah.number);
                }
            })
            .catch(() => setFailed(true));
    }, []);

    const activeDataset = datasets?.[riwayah];
    const surah = activeDataset?.surahs.find(
        (item) => item.number === surahNumber,
    );
    const hafsSurah = datasets?.hafs.surahs.find(
        (item) => item.number === surahNumber,
    );
    const translatedSurah = datasets?.translation.surahs.find(
        (item) => item.number === surahNumber,
    );
    const translatedAyahs = useMemo(
        () =>
            new Map(
                translatedSurah?.ayahs.map((ayah) => [ayah.number, ayah.text]),
            ),
        [translatedSurah],
    );

    function chooseSurah(number: number) {
        setSurahNumber(number);
        localStorage.setItem("quran-offline-last-surah", String(number));
        const url = new URL(window.location.href);
        url.searchParams.set("surah", String(number));
        window.history.replaceState({}, "", url);
        document
            .querySelector("main")
            ?.scrollTo({ top: 0, behavior: "smooth" });
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    return (
        <div
            data-offline-reader
            lang={language}
            dir={language === "ar" ? "rtl" : "ltr"}
            className={cn(
                "relative min-h-dvh overflow-x-clip bg-background text-foreground",
                riwayah === "warsh" && "riwayah-warsh",
            )}
        >
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-[30rem] bg-[radial-gradient(ellipse_at_top,color-mix(in_oklab,var(--primary)_8%,transparent),transparent_68%)]"
            />

            <header className="sticky top-0 z-30 border-b border-border/40 bg-background/88 backdrop-blur-xl">
                <div className="app-container flex h-[calc(4rem+env(safe-area-inset-top))] items-center justify-between gap-4 pt-[env(safe-area-inset-top)] sm:h-[calc(5rem+env(safe-area-inset-top))]">
                    <AppPrimaryNav />
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CloudOff className="size-4" aria-hidden="true" />
                        {labels.offline}
                    </span>
                    <AppLogo />
                </div>
            </header>

            <main className="app-container relative pb-32">
                <section className="py-4 sm:py-5">
                    <div className="grid gap-3 rounded-2xl bg-muted/35 p-2.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:gap-4 sm:p-3">
                        <label className="grid min-w-0 gap-1.5 ps-1 text-[0.65rem] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                            <span>{labels.surah}</span>
                            <select
                                value={surahNumber}
                                onChange={(event) =>
                                    chooseSurah(Number(event.target.value))
                                }
                                className="h-11 w-full min-w-0 rounded-xl border-0 bg-background/85 px-3 text-sm font-medium text-foreground shadow-sm outline-none transition-shadow focus:ring-2 focus:ring-primary/20"
                            >
                                {(datasets?.hafs.surahs ?? []).map((item) => (
                                    <option
                                        key={item.number}
                                        value={item.number}
                                    >
                                        {item.number}. {item.name} ·{" "}
                                        {item.englishName}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <div className="grid h-11 grid-cols-3 gap-1 self-end rounded-xl bg-background/70 p-1 shadow-sm">
                            {(["hafs", "warsh"] as const).map((value) => (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() => setRiwayah(value)}
                                    className={cn(
                                        "min-w-18 rounded-lg px-3 text-xs font-semibold transition-[color,background-color,box-shadow]",
                                        riwayah === value
                                            ? "bg-primary text-primary-foreground shadow-sm"
                                            : "text-muted-foreground hover:text-foreground",
                                    )}
                                >
                                    {labels[value]}
                                </button>
                            ))}
                            <button
                                type="button"
                                disabled={riwayah === "warsh"}
                                onClick={() =>
                                    setShowTranslation((value) => !value)
                                }
                                className={cn(
                                    "flex min-w-18 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-[color,background-color,box-shadow]",
                                    showTranslation && riwayah === "hafs"
                                        ? "bg-primary text-primary-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground",
                                    "disabled:cursor-not-allowed disabled:opacity-35",
                                )}
                            >
                                <Languages
                                    aria-hidden="true"
                                    className="hidden size-3.5 min-[440px]:block"
                                />
                                {labels.translation}
                            </button>
                        </div>
                    </div>
                </section>

                {!datasets && !failed && (
                    <div className="flex min-h-[50dvh] items-center justify-center text-sm text-muted-foreground">
                        {labels.loading}
                    </div>
                )}

                {failed && (
                    <div className="flex min-h-[55dvh] flex-col items-center justify-center text-center">
                        <span className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <CloudOff className="size-7" aria-hidden="true" />
                        </span>
                        <h1 className="mt-5 text-xl font-semibold">
                            {labels.unavailableTitle}
                        </h1>
                        <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                            {labels.unavailableDescription}
                        </p>
                    </div>
                )}

                {surah && (
                    <article className="mx-auto max-w-5xl">
                        <header className="relative isolate overflow-hidden py-7 text-center sm:py-9">
                            <div
                                aria-hidden="true"
                                className="absolute top-1/2 left-1/2 -z-10 size-52 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/[0.045] blur-2xl sm:size-72"
                            />
                            <div className="mx-auto mb-3 flex max-w-sm items-center gap-4 text-primary/35 sm:mb-4">
                                <span className="h-px flex-1 bg-gradient-to-r from-transparent to-current rtl:bg-gradient-to-l" />
                                <span className="flex size-8 rotate-45 items-center justify-center rounded-[0.35rem] border border-current">
                                    <span className="-rotate-45 font-mono text-[0.62rem] font-semibold text-primary">
                                        {String(surah.number).padStart(2, "0")}
                                    </span>
                                </span>
                                <span className="h-px flex-1 bg-gradient-to-l from-transparent to-current rtl:bg-gradient-to-r" />
                            </div>
                            <h1 className="ayah text-[clamp(2.35rem,7vw,4.5rem)] font-normal leading-[1.55] text-foreground">
                                {surah.name}
                            </h1>
                            <p className="mt-1 text-xs font-medium tracking-[0.1em] text-primary uppercase sm:text-sm">
                                {hafsSurah?.englishName ?? surah.englishName}
                                {hafsSurah?.englishNameTranslation
                                    ? ` · ${hafsSurah.englishNameTranslation}`
                                    : ""}
                            </p>
                            <p className="mt-3 text-xs text-muted-foreground">
                                {labels.juz} {surah.ayahs[0]?.juz}
                                <span className="mx-2 text-border">•</span>
                                {surah.ayahs.length} {labels.ayah}
                            </p>
                        </header>

                        <div
                            dir="rtl"
                            lang="ar"
                            className="quran-reading-surface relative mx-auto max-w-4xl pb-10 sm:pb-14"
                            data-riwayah={riwayah}
                        >
                            {showTranslation && riwayah === "hafs" ? (
                                <div className="divide-y divide-border/35">
                                    {surah.ayahs.map((ayah) => (
                                        <section
                                            key={ayah.number}
                                            className="group/translation relative py-7 sm:grid sm:grid-cols-[3rem_minmax(0,1fr)] sm:gap-5 sm:py-9"
                                        >
                                            <span className="frame mb-2 inline-block text-2xl text-primary sm:mt-2 sm:mb-0 sm:text-center sm:text-3xl">
                                                {getArabicNumber(ayah.number)}
                                            </span>
                                            <div>
                                                <p className="ayah quran-reading-flow quran-reader-text text-right text-foreground">
                                                    {ayah.text}
                                                </p>
                                                <p
                                                    dir="ltr"
                                                    lang="en"
                                                    className="mt-4 max-w-3xl text-left font-serif text-sm leading-7 text-muted-foreground sm:mt-5 sm:text-base sm:leading-8"
                                                >
                                                    {translatedAyahs.get(
                                                        ayah.number,
                                                    )}
                                                </p>
                                            </div>
                                        </section>
                                    ))}
                                </div>
                            ) : (
                                <p
                                    className="ayah quran-reading-flow quran-reader-text py-2 text-justify text-foreground sm:py-4"
                                    style={{ textAlignLast: "center" }}
                                >
                                    {surah.ayahs.map((ayah) => (
                                        <span
                                            key={ayah.number}
                                            className="me-[0.3em]"
                                        >
                                            {ayah.text}
                                            <span className="frame relative mx-[0.12em] inline-block align-[0.08em] text-[1.04em] text-primary">
                                                {getArabicNumber(ayah.number)}
                                            </span>{" "}
                                        </span>
                                    ))}
                                </p>
                            )}
                        </div>
                    </article>
                )}
            </main>

            {surah && (
                <nav
                    aria-label={labels.surah}
                    className="fixed bottom-3 left-1/2 z-30 flex h-14 w-[calc(100%-1.5rem)] max-w-xl -translate-x-1/2 items-center justify-between rounded-2xl bg-background/92 px-2 shadow-xl shadow-black/8 ring-1 ring-border/50 backdrop-blur-xl sm:bottom-5"
                >
                    <Button
                        type="button"
                        variant="ghost"
                        disabled={surahNumber <= 1}
                        onClick={() => chooseSurah(surahNumber - 1)}
                        className="rounded-xl px-3"
                    >
                        <ChevronLeft className="size-4 rtl:rotate-180" />
                        <span className="hidden min-[380px]:inline">
                            {labels.previous}
                        </span>
                    </Button>
                    <div className="min-w-0 px-2 text-center">
                        <p className="truncate text-xs font-semibold">
                            {hafsSurah?.englishName ?? surah.englishName}
                        </p>
                        <p className="mt-0.5 text-[0.62rem] text-muted-foreground">
                            {surah.number} / 114
                        </p>
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        disabled={surahNumber >= 114}
                        onClick={() => chooseSurah(surahNumber + 1)}
                        className="rounded-xl px-3"
                    >
                        <span className="hidden min-[380px]:inline">
                            {labels.next}
                        </span>
                        <ChevronRight className="size-4 rtl:rotate-180" />
                    </Button>
                </nav>
            )}
        </div>
    );
}
