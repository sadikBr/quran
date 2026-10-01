"use client";

import { Ellipsis, LoaderCircle, Pause, Play, RefreshCcw } from "lucide-react";
import Link, { useLinkStatus } from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import type { Riwayah } from "@/features/settings/preferences";
import { getArabicNumber } from "@/lib/arabic-numbers";
import { cn } from "@/lib/utils";
import getAyahAudioStreams from "../helpers/get-ayah-audio-streams";
import type { QuranDivisionMarker } from "../navigation-types";
import type { AyahType } from "../types";
import { useQuranAudio } from "./quran-audio-provider";
import TajweedText from "./tajweed-text";

export default function Ayah({
    ayah,
    surahNumber,
    highlightEnabled = true,
    hidePrintedDivisionMarker = false,
    divisionMarker,
    riwayah = "hafs",
    actionsHref,
}: {
    ayah: AyahType;
    surahNumber: number;
    highlightEnabled?: boolean;
    hidePrintedDivisionMarker?: boolean;
    divisionMarker?: QuranDivisionMarker;
    riwayah?: Riwayah;
    actionsHref?: string;
}) {
    const ayahRef = useRef<HTMLSpanElement>(null);
    const t = useTranslations("Reader");
    const locale = useLocale();
    const { activeAyahNumber, playbackStatus } = useQuranAudio();
    const playbackAyahNumber = ayah.audioNumber ?? ayah.number;
    const isActiveAyah =
        highlightEnabled &&
        activeAyahNumber === playbackAyahNumber &&
        playbackStatus !== "idle" &&
        playbackStatus !== "error";
    const resolvedActionsHref =
        actionsHref ?? `/quran/ayah/${surahNumber}/${ayah.numberInSurah}`;
    const displayedText = hidePrintedDivisionMarker
        ? ayah.text.replace(riwayah === "warsh" ? /[۞*]/u : "۞", "").trimStart()
        : ayah.text;

    useEffect(() => {
        if (!isActiveAyah) return;

        const element = ayahRef.current;
        if (!element) return;

        const bounds = element.getBoundingClientRect();
        const comfortableTop = 112;
        const comfortableBottom = window.innerHeight - 128;

        if (
            bounds.top >= comfortableTop &&
            bounds.bottom <= comfortableBottom
        ) {
            return;
        }

        element.scrollIntoView({
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
                .matches
                ? "auto"
                : "smooth",
            block: "center",
            inline: "nearest",
        });
    }, [isActiveAyah]);

    return (
        <>
            {ayah.legacyAnchorNumber !== undefined &&
                ayah.legacyAnchorNumber !== ayah.number && (
                    <span
                        id={`ayah-${ayah.legacyAnchorNumber}`}
                        className="scroll-mt-6"
                        aria-hidden="true"
                    />
                )}
            <span
                ref={ayahRef}
                id={`ayah-${ayah.number}`}
                data-hafs-ayah={ayah.hafsGlobalNumber ?? ayah.number}
                data-ayah-number={ayah.numberInSurah}
                data-audio-ayah={playbackAyahNumber}
                tabIndex={-1}
                className={cn(
                    "ayah quran-reader-text group/ayah me-[0.35em] inline scroll-mt-6 rounded-md leading-[inherit] text-foreground transition-[background-color,color,box-shadow] duration-500 ease-out",
                    isActiveAyah &&
                        "bg-primary/6 shadow-[inset_0_-1px_0_hsl(var(--primary)/0.45)] dark:bg-primary/9",
                )}
            >
                <span
                    className={cn(
                        divisionMarker && !ayah.sajda && "text-division",
                        ayah.sajda &&
                            "text-primary underline decoration-primary/40 decoration-2 underline-offset-8",
                    )}
                >
                    {divisionMarker && (
                        <AyahDivisionIndicator
                            marker={divisionMarker}
                            locale={locale}
                            riwayah={riwayah}
                        />
                    )}
                    <TajweedText text={displayedText} />
                </span>{" "}
                <AyahPlayer ayah={ayah} />
                <span className="relative inline-block align-[0.08em]">
                    <Link
                        href={resolvedActionsHref}
                        scroll={false}
                        className="frame relative inline-block rounded-sm text-primary transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={t("ayah.openActions", {
                            number: ayah.numberInSurah,
                        })}
                    >
                        <AyahActionsPending />
                        <span className="transition-opacity duration-300 ease-out sm:group-hover/ayah:opacity-0 sm:group-focus-within/ayah:opacity-0">
                            {getArabicNumber(ayah.numberInSurah)}
                        </span>
                        <span
                            aria-hidden="true"
                            className="pointer-events-none absolute top-[55%] left-1/2 flex size-6 -translate-x-1/2 -translate-y-1/2 scale-95 items-center justify-center rounded-full bg-primary/10 font-sans text-primary opacity-0 transition-[opacity,transform,background-color,color] duration-200 ease-out sm:group-hover/ayah:scale-100 sm:group-hover/ayah:opacity-100 sm:group-focus-within/ayah:scale-100 sm:group-focus-within/ayah:opacity-100"
                        >
                            <Ellipsis className="size-4" />
                        </span>
                    </Link>
                </span>
            </span>
        </>
    );
}

function AyahDivisionIndicator({
    marker,
    locale,
    riwayah,
}: {
    marker: QuranDivisionMarker;
    locale: string;
    riwayah: Riwayah;
}) {
    const t = useTranslations("Reader.divisions");
    const quarterPosition = marker.hizbQuarterNumber
        ? ((marker.hizbQuarterNumber - 1) % 4) + 1
        : undefined;
    const labels = [
        marker.juzNumber !== undefined
            ? t("juzNumber", { number: marker.juzNumber })
            : null,
        marker.hizbNumber !== undefined
            ? t("hizbNumber", { number: marker.hizbNumber })
            : null,
        quarterPosition !== undefined
            ? t("quarterNumber", { number: String(quarterPosition) })
            : null,
    ].filter((label): label is string => label !== null);
    const label = labels.join(" · ");

    return (
        <span className="group/division relative me-1 inline-flex align-middle">
            <button
                type="button"
                aria-label={label}
                className={cn(
                    "inline-flex items-center justify-center rounded-sm px-[0.06em] leading-none text-division/75 transition-[color,transform] hover:scale-110 hover:text-division focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-division focus-visible:ring-offset-2",
                    riwayah === "warsh"
                        ? "text-[0.9em]"
                        : "font-serif text-[0.68em]",
                )}
            >
                ۞
            </button>
            <span
                role="tooltip"
                dir={locale === "ar" ? "rtl" : "ltr"}
                className="pointer-events-none absolute bottom-[calc(100%+0.55rem)] left-1/2 z-30 w-max max-w-[min(18rem,calc(100vw-2rem))] -translate-x-1/2 translate-y-1 rounded-xl bg-popover px-3 py-2 font-sans text-xs leading-5 text-popover-foreground opacity-0 shadow-xl ring-1 ring-border/60 transition-[opacity,transform] duration-150 group-hover/division:translate-y-0 group-hover/division:opacity-100 group-focus-within/division:translate-y-0 group-focus-within/division:opacity-100"
            >
                {label}
            </span>
        </span>
    );
}

function AyahPlayer({ ayah }: { ayah: AyahType }) {
    const t = useTranslations("Reader");
    const streams = getAyahAudioStreams(ayah);
    const playbackAyahNumber = ayah.audioNumber ?? ayah.number;
    const {
        activeAyahNumber,
        isPlaying,
        playbackStatus,
        progress,
        retryAudio,
        toggleAudio,
    } = useQuranAudio();

    if (streams.length === 0) return null;

    const isCurrentAyah = activeAyahNumber === playbackAyahNumber;
    const isPlayingThisAyah = isCurrentAyah && isPlaying;
    const isLoadingThisAyah = isCurrentAyah && playbackStatus === "loading";
    const hasPlaybackError = isCurrentAyah && playbackStatus === "error";
    const progressOffset = 75.4 * (1 - Math.min(Math.max(progress, 0), 1));
    const actionLabel = hasPlaybackError
        ? t("ayah.retry")
        : isPlayingThisAyah
          ? t("ayah.pause")
          : t("ayah.play");

    return (
        <>
            <span className="relative inline-flex translate-y-[-0.05em] align-middle">
                {isCurrentAyah && progress > 0 && !hasPlaybackError && (
                    <svg
                        aria-hidden="true"
                        viewBox="0 0 28 28"
                        className="pointer-events-none absolute -inset-0.5 size-8 -rotate-90 text-primary pointer-coarse:size-11"
                    >
                        <circle
                            cx="14"
                            cy="14"
                            r="12"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeDasharray="75.4"
                            strokeDashoffset={progressOffset}
                            className="transition-[stroke-dashoffset] duration-300 ease-linear"
                        />
                    </svg>
                )}
                <button
                    type="button"
                    disabled={isLoadingThisAyah}
                    onClick={() =>
                        hasPlaybackError
                            ? retryAudio()
                            : toggleAudio(playbackAyahNumber, streams)
                    }
                    className={cn(
                        "relative inline-flex size-7 items-center justify-center rounded-full border border-primary/30 bg-primary/8 text-primary transition-[background-color,border-color,color,box-shadow] duration-300 hover:border-primary hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-wait pointer-coarse:size-10",
                        isPlayingThisAyah &&
                            "border-primary bg-primary/15 shadow-[0_0_0_3px_hsl(var(--primary)/0.1)]",
                        hasPlaybackError &&
                            "border-destructive/40 bg-destructive/8 text-destructive hover:border-destructive hover:bg-destructive hover:text-destructive-foreground",
                    )}
                    aria-label={t("ayah.playerLabel", {
                        action: actionLabel,
                        number: ayah.numberInSurah,
                    })}
                >
                    {isLoadingThisAyah ? (
                        <LoaderCircle
                            className="size-3 animate-spin"
                            aria-hidden="true"
                        />
                    ) : hasPlaybackError ? (
                        <RefreshCcw className="size-3" aria-hidden="true" />
                    ) : isPlayingThisAyah ? (
                        <Pause
                            className="size-3 fill-current"
                            aria-hidden="true"
                        />
                    ) : (
                        <Play
                            className="ms-px size-3 fill-current"
                            aria-hidden="true"
                        />
                    )}
                </button>
            </span>{" "}
        </>
    );
}

function AyahActionsPending() {
    const { pending } = useLinkStatus();
    const t = useTranslations("Common");
    if (!pending) return null;
    return (
        <output className="absolute inset-0 z-10 flex items-center justify-center rounded-full bg-background">
            <LoaderCircle aria-hidden="true" className="size-5 animate-spin" />
            <span className="sr-only">{t("loading.label")}</span>
        </output>
    );
}
