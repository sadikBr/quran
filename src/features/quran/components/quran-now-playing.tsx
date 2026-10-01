"use client";

import { LoaderCircle, Pause, Play, Repeat2, Square } from "lucide-react";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { AudioPlayer, PlayerState } from "../helpers/audio-player";
import type { AudioTrack } from "../helpers/audio-track";

export default function NowPlaying({
    player,
    state,
    title,
    artist,
    labelTrack,
}: {
    player: AudioPlayer;
    state: PlayerState;
    title: string;
    artist: string;
    labelTrack: (track: AudioTrack) => { title: string; artist: string };
}) {
    const t = useTranslations("Reader.audio");
    const locale = useLocale();
    const pathname = usePathname();
    const hasPageNavigation = /^\/quran\/(page|surah|ayah)\//.test(pathname);
    const bottomOffset = hasPageNavigation ? "5rem" : "0.5rem";
    const playerRef = useRef<HTMLElement>(null);
    const [expanded, setExpanded] = useState(false);
    const [mode, setMode] = useState("ayah");
    const [count, setCount] = useState(3);
    const [gap, setGap] = useState(0);
    const [from, setFrom] = useState(0);
    const [to, setTo] = useState(0);

    useLayoutEffect(() => {
        const element = playerRef.current;
        if (!element) return;

        // The reader toolbar is portaled to body; share the player's actual
        // height so expanding repeat settings or wrapping text cannot cover it.
        function updateClearance() {
            if (!element) return;
            const height = Math.ceil(element.getBoundingClientRect().height);
            document.body.style.setProperty(
                "--quran-audio-player-clearance",
                `calc(${bottomOffset} + env(safe-area-inset-bottom) + ${height}px + 0.75rem)`,
            );
        }

        updateClearance();
        const observer = new ResizeObserver(updateClearance);
        observer.observe(element);
        return () => {
            observer.disconnect();
            document.body.style.removeProperty(
                "--quran-audio-player-clearance",
            );
        };
    }, [bottomOffset]);

    const queue = player.readerQueue.filter(
        (track) => track.ayahNumber !== null,
    );
    const busy = ["playing", "loading", "waiting"].includes(state.status);
    const finished = state.status === "idle" && state.progress === 1;
    const jumpToAyah = () => {
        if (state.track?.ayahNumber == null) return;
        const target = document.querySelector<HTMLElement>(
            `[data-audio-ayah="${state.track.ayahNumber}"]`,
        );
        if (!target) return;
        target.focus({ preventScroll: true });
        target.scrollIntoView({
            block: "center",
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
                .matches
                ? "instant"
                : "smooth",
        });
    };
    const fieldClass =
        "mt-1 h-11 w-full min-w-0 rounded-lg border border-border bg-background px-2 text-base text-foreground sm:text-sm";
    return (
        <section
            ref={playerRef}
            data-quran-audio-player
            dir={locale === "ar" ? "rtl" : "ltr"}
            aria-label={t("nowPlaying")}
            className="fixed inset-x-2 z-40 mx-auto flex max-w-lg flex-col overflow-x-hidden overflow-y-auto overscroll-contain rounded-xl border border-border bg-background/95 shadow-lg backdrop-blur sm:inset-x-3 sm:rounded-2xl"
            style={{
                bottom: `calc(${bottomOffset} + env(safe-area-inset-bottom))`,
                maxHeight: `calc(100dvh - ${bottomOffset} - env(safe-area-inset-bottom) - env(safe-area-inset-top) - 5rem)`,
            }}
        >
            {expanded && (
                <div
                    className="min-h-32 max-h-[min(60dvh,24rem)] overflow-y-auto overscroll-contain border-b border-border p-3"
                    id="audio-repeat-options"
                >
                    <div className="grid grid-cols-2 gap-3">
                        <label className="col-span-2 text-xs text-muted-foreground">
                            {t("repeatMode")}
                            <select
                                className={fieldClass}
                                value={mode}
                                onChange={(e) => setMode(e.target.value)}
                            >
                                <option value="ayah">
                                    {state.track?.ayahNumber === null
                                        ? t("currentRecording")
                                        : t("currentAyah")}
                                </option>
                                {queue.length > 1 && (
                                    <option value="range">
                                        {t("selectedRange")}
                                    </option>
                                )}
                            </select>
                        </label>
                        {mode === "range" && queue.length > 1 && (
                            <>
                                <label className="col-span-2 min-w-0 text-xs text-muted-foreground sm:col-span-1">
                                    {t("from")}
                                    <select
                                        className={fieldClass}
                                        value={from}
                                        onChange={(e) => {
                                            const value = Number(
                                                e.target.value,
                                            );
                                            setFrom(value);
                                            setTo(Math.max(to, value));
                                        }}
                                    >
                                        {queue.map((track, i) => (
                                            <option
                                                key={track.streams[0]}
                                                value={i}
                                            >
                                                {labelTrack(track).title}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label className="col-span-2 min-w-0 text-xs text-muted-foreground sm:col-span-1">
                                    {t("to")}
                                    <select
                                        className={fieldClass}
                                        value={to}
                                        onChange={(e) =>
                                            setTo(Number(e.target.value))
                                        }
                                    >
                                        {queue.map(
                                            (track, i) =>
                                                i >= from && (
                                                    <option
                                                        key={track.streams[0]}
                                                        value={i}
                                                    >
                                                        {
                                                            labelTrack(track)
                                                                .title
                                                        }
                                                    </option>
                                                ),
                                        )}
                                    </select>
                                </label>
                            </>
                        )}
                        <label className="text-xs text-muted-foreground">
                            {t("repeatCount")}
                            <select
                                className={fieldClass}
                                value={count}
                                onChange={(e) =>
                                    setCount(Number(e.target.value))
                                }
                            >
                                {[1, 2, 3, 5, 10, 20].map((n) => (
                                    <option key={n} value={n}>
                                        {n}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="text-xs text-muted-foreground">
                            {t("gapSeconds")}
                            <select
                                className={fieldClass}
                                value={gap}
                                onChange={(e) => setGap(Number(e.target.value))}
                            >
                                {[0, 2, 5, 10, 15, 30].map((n) => (
                                    <option key={n} value={n}>
                                        {n}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>
                    <Button
                        className="mt-3 w-full"
                        size="sm"
                        onClick={() => {
                            const selected =
                                mode === "range" && queue.length > 1
                                    ? queue.slice(from, to + 1)
                                    : state.track
                                      ? [state.track]
                                      : [];
                            player.configure({ count, gap });
                            player.start(selected);
                            setExpanded(false);
                        }}
                    >
                        {t("startPractice")}
                    </Button>
                </div>
            )}
            <div className="flex shrink-0 items-center gap-0.5 p-1.5 sm:gap-1 sm:p-2">
                <div className="min-w-0 flex-1 px-1.5 sm:px-2">
                    <button
                        type="button"
                        disabled={state.track?.ayahNumber == null}
                        onClick={jumpToAyah}
                        aria-label={
                            state.track?.ayahNumber != null
                                ? t("jumpToAyah", { title })
                                : title
                        }
                        className="block w-full truncate rounded text-start text-xs font-medium leading-5 hover:text-primary focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-default sm:text-sm"
                        title={title}
                    >
                        {title}
                    </button>
                    <p
                        className="truncate text-[11px] leading-4 text-muted-foreground sm:text-xs"
                        title={artist}
                    >
                        {artist}
                    </p>
                    {state.status === "loading" && (
                        <output className="text-xs text-muted-foreground">
                            {t("loadingShort")}
                        </output>
                    )}
                    {state.status === "waiting" && (
                        <output className="block text-xs text-primary">
                            {t("yourTurn")}
                        </output>
                    )}
                    {finished && (
                        <output className="block text-xs text-primary">
                            {t("finished")}
                        </output>
                    )}
                    {(player.repeat.count > 1 || player.repeat.gap > 0) && (
                        <div className="flex flex-wrap items-center gap-x-2">
                            <p className="text-xs text-muted-foreground">
                                {t("repetition", {
                                    current: String(state.repetition),
                                    total: String(player.repeat.count),
                                })}
                            </p>
                            <button
                                type="button"
                                className="min-h-8 rounded px-1 text-xs text-primary underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-ring"
                                onClick={() => {
                                    player.disableRepeat();
                                    setCount(1);
                                    setGap(0);
                                }}
                            >
                                {t("repeatOff")}
                            </button>
                        </div>
                    )}
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    className="size-11 shrink-0"
                    aria-label={t("repeatMode")}
                    aria-expanded={expanded}
                    aria-controls="audio-repeat-options"
                    onClick={() => {
                        if (!expanded) {
                            setCount(
                                player.repeat.count > 1
                                    ? player.repeat.count
                                    : 3,
                            );
                            setGap(player.repeat.gap);
                        }
                        setExpanded(!expanded);
                    }}
                >
                    <Repeat2 className="size-4" />
                </Button>
                <Button
                    size="icon"
                    className="size-11 shrink-0"
                    aria-label={
                        busy
                            ? t("pauseShort")
                            : state.status === "error"
                              ? t("retryShort")
                              : finished
                                ? t("replay")
                                : t("continueShort")
                    }
                    onClick={() => {
                        void player.toggle();
                    }}
                >
                    {state.status === "loading" ? (
                        <LoaderCircle className="size-4 animate-spin" />
                    ) : busy ? (
                        <Pause className="size-4" />
                    ) : (
                        <Play className="size-4" />
                    )}
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="size-11 shrink-0"
                    aria-label={t("stop")}
                    onClick={player.stop}
                >
                    <Square className="size-4" />
                </Button>
            </div>
            {state.status === "error" && (
                <div
                    role="alert"
                    className="flex shrink-0 flex-wrap items-center gap-2 border-t border-border px-3 py-2 text-xs"
                >
                    <span className="flex-1 text-muted-foreground">
                        {t("unableToPlay")}
                    </span>
                    <Button variant="outline" size="sm" onClick={player.retry}>
                        {t("retryShort")}
                    </Button>
                    {state.index + 1 < state.queue.length && (
                        <Button variant="ghost" size="sm" onClick={player.skip}>
                            {t("skipAyah")}
                        </Button>
                    )}
                </div>
            )}
            <div aria-hidden="true" className="h-0.5 shrink-0 bg-muted">
                <div
                    className="h-full bg-primary transition-[width]"
                    style={{
                        width: `${Math.min(100, Math.max(0, state.progress * 100))}%`,
                    }}
                />
            </div>
        </section>
    );
}
