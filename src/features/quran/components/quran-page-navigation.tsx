"use client";

import { ArrowLeft, ArrowRight, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Combobox,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
    ComboboxTrigger,
} from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import type { ReadingMode } from "@/features/settings/preferences";
import { getArabicNumber } from "@/lib/arabic-numbers";
import QuranInfo from "@/lib/quran-info";
import type { SurahType } from "../types";

const navigationDetails = {
    page: {
        label: "Page",
        min: QuranInfo.minPageNumber,
        max: QuranInfo.maxPageNumber,
    },
    surah: {
        label: "Surah",
        min: QuranInfo.minSurahNumber,
        max: QuranInfo.maxSurahNumber,
    },
} as const;

const SWIPE_DISTANCE = 72;
const SWIPE_DIRECTION_RATIO = 1.35;
const SWIPE_MAX_DURATION = 900;
const SCREEN_EDGE_GUARD = 24;
const SWIPE_INTENT_DISTANCE = 10;
const SWIPE_DRAG_LIMIT = 112;
const SWIPE_EXCLUDED_TARGETS =
    'a, button, input, textarea, select, nav, audio, video, [role="button"], [role="dialog"], [role="listbox"], [role="menu"], [contenteditable="true"]';

function normalizeSurahSearch(value: string) {
    return value
        .normalize("NFKD")
        .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
        .replace(/ـ/g, "")
        .replace(/[أإآٱ]/g, "ا")
        .replace(/ى/g, "ي")
        .toLocaleLowerCase();
}

export default function QuranPageNavigation({
    currentNumber,
    readingMode,
    surahs,
}: {
    currentNumber: number;
    readingMode: ReadingMode;
    surahs?: SurahType[];
}) {
    const [inputValue, setInputValue] = useState(currentNumber.toString());
    const [isNavigating, setIsNavigating] = useState(false);
    const touchState = useRef<{
        startX: number;
        startY: number;
        lastX: number;
        lastY: number;
        startedAt: number;
        intent: "pending" | "horizontal" | "vertical";
        content: HTMLElement | null;
    } | null>(null);
    const motionResetTimer = useRef<number | null>(null);
    const motionContent = useRef<HTMLElement | null>(null);
    const isNavigatingRef = useRef(false);
    const router = useRouter();
    const { label, min, max } = navigationDetails[readingMode];

    useEffect(() => {
        setInputValue(currentNumber.toString());
        setIsNavigating(false);
        isNavigatingRef.current = false;
    }, [currentNumber]);

    function navigateTo(number: number) {
        setIsNavigating(true);
        isNavigatingRef.current = true;
        router.push(`/quran/${readingMode}/${number}`);
    }

    useEffect(() => {
        function handleKeyDown(event: KeyboardEvent) {
            if (
                event.altKey ||
                event.ctrlKey ||
                event.metaKey ||
                event.shiftKey ||
                !(event.target instanceof HTMLElement) ||
                event.target.closest(
                    'input, textarea, select, [contenteditable="true"]',
                )
            ) {
                return;
            }

            if (event.key === "ArrowRight" && currentNumber > min) {
                event.preventDefault();
                setIsNavigating(true);
                isNavigatingRef.current = true;
                router.push(`/quran/${readingMode}/${currentNumber - 1}`);
            }

            if (event.key === "ArrowLeft" && currentNumber < max) {
                event.preventDefault();
                setIsNavigating(true);
                isNavigatingRef.current = true;
                router.push(`/quran/${readingMode}/${currentNumber + 1}`);
            }
        }

        window.addEventListener("keydown", handleKeyDown);

        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [currentNumber, max, min, readingMode, router]);

    useEffect(() => {
        const prefersReducedMotion = window.matchMedia(
            "(prefers-reduced-motion: reduce)",
        ).matches;

        function clearMotionResetTimer() {
            if (motionResetTimer.current !== null) {
                window.clearTimeout(motionResetTimer.current);
                motionResetTimer.current = null;
            }
        }

        function restoreContent(content: HTMLElement | null, animate: boolean) {
            if (!content) return;

            content.style.transition =
                animate && !prefersReducedMotion
                    ? "transform 180ms ease-out, opacity 180ms ease-out"
                    : "none";
            content.style.transform = "translate3d(0, 0, 0)";
            content.style.opacity = "1";
            content.style.willChange = "auto";

            clearMotionResetTimer();
            motionResetTimer.current = window.setTimeout(
                () => {
                    content.style.removeProperty("transition");
                    content.style.removeProperty("transform");
                    content.style.removeProperty("opacity");
                    content.style.removeProperty("will-change");
                    motionResetTimer.current = null;
                },
                animate && !prefersReducedMotion ? 200 : 0,
            );
        }

        function resetTouchState() {
            touchState.current = null;
        }

        function handleTouchStart(event: TouchEvent) {
            if (
                isNavigatingRef.current ||
                event.touches.length !== 1 ||
                !(event.target instanceof HTMLElement) ||
                event.target.closest(SWIPE_EXCLUDED_TARGETS)
            ) {
                resetTouchState();
                return;
            }

            const touch = event.touches[0];
            const content = document.querySelector<HTMLElement>(
                "[data-quran-swipe-content]",
            );
            motionContent.current = content;

            if (
                touch.clientX <= SCREEN_EDGE_GUARD ||
                touch.clientX >= window.innerWidth - SCREEN_EDGE_GUARD
            ) {
                resetTouchState();
                return;
            }

            restoreContent(content, false);

            touchState.current = {
                startX: touch.clientX,
                startY: touch.clientY,
                lastX: touch.clientX,
                lastY: touch.clientY,
                startedAt: performance.now(),
                intent: "pending",
                content,
            };
        }

        function handleTouchMove(event: TouchEvent) {
            if (!touchState.current || event.touches.length !== 1) return;

            const touch = event.touches[0];
            const gesture = touchState.current;
            gesture.lastX = touch.clientX;
            gesture.lastY = touch.clientY;

            const horizontalDistance = touch.clientX - gesture.startX;
            const verticalDistance = touch.clientY - gesture.startY;

            if (
                gesture.intent === "pending" &&
                Math.max(
                    Math.abs(horizontalDistance),
                    Math.abs(verticalDistance),
                ) >= SWIPE_INTENT_DISTANCE
            ) {
                gesture.intent =
                    Math.abs(horizontalDistance) >
                    Math.abs(verticalDistance) * SWIPE_DIRECTION_RATIO
                        ? "horizontal"
                        : "vertical";
            }

            if (
                gesture.intent !== "horizontal" ||
                !gesture.content ||
                prefersReducedMotion
            ) {
                return;
            }

            const isAtBoundary =
                (horizontalDistance < 0 && currentNumber <= min) ||
                (horizontalDistance > 0 && currentNumber >= max);
            const dragResistance = isAtBoundary ? 0.12 : 0.42;
            const offset = Math.max(
                -SWIPE_DRAG_LIMIT,
                Math.min(SWIPE_DRAG_LIMIT, horizontalDistance * dragResistance),
            );
            const progress = Math.min(
                Math.abs(horizontalDistance) / SWIPE_DISTANCE,
                1,
            );

            gesture.content.style.transition = "none";
            gesture.content.style.transform = `translate3d(${offset}px, 0, 0)`;
            gesture.content.style.opacity = `${1 - progress * 0.08}`;
            gesture.content.style.willChange = "transform, opacity";
        }

        function handleTouchEnd(event: TouchEvent) {
            const gesture = touchState.current;
            resetTouchState();

            if (!gesture || isNavigatingRef.current) return;

            const finalTouch = event.changedTouches[0];
            const endX = finalTouch?.clientX ?? gesture.lastX;
            const endY = finalTouch?.clientY ?? gesture.lastY;
            const horizontalDistance = endX - gesture.startX;
            const verticalDistance = endY - gesture.startY;
            const duration = performance.now() - gesture.startedAt;

            if (
                Math.abs(horizontalDistance) < SWIPE_DISTANCE ||
                Math.abs(horizontalDistance) <
                    Math.abs(verticalDistance) * SWIPE_DIRECTION_RATIO ||
                duration > SWIPE_MAX_DURATION ||
                gesture.intent === "vertical"
            ) {
                restoreContent(gesture.content, true);
                return;
            }

            const targetNumber =
                horizontalDistance < 0 ? currentNumber - 1 : currentNumber + 1;

            if (targetNumber < min || targetNumber > max) {
                restoreContent(gesture.content, true);
                return;
            }

            if (gesture.content && !prefersReducedMotion) {
                const exitOffset =
                    Math.sign(horizontalDistance) *
                    Math.min(window.innerWidth * 0.18, 160);

                gesture.content.style.transition =
                    "transform 180ms ease-out, opacity 180ms ease-out";
                gesture.content.style.transform = `translate3d(${exitOffset}px, 0, 0)`;
                gesture.content.style.opacity = "0.72";
            }

            setIsNavigating(true);
            isNavigatingRef.current = true;
            router.push(`/quran/${readingMode}/${targetNumber}`);

            clearMotionResetTimer();
            motionResetTimer.current = window.setTimeout(() => {
                restoreContent(gesture.content, true);
            }, 900);
        }

        function handleTouchCancel() {
            const content = touchState.current?.content ?? null;
            resetTouchState();
            restoreContent(content, true);
        }

        window.addEventListener("touchstart", handleTouchStart, {
            passive: true,
        });
        window.addEventListener("touchmove", handleTouchMove, {
            passive: true,
        });
        window.addEventListener("touchend", handleTouchEnd, {
            passive: true,
        });
        window.addEventListener("touchcancel", handleTouchCancel, {
            passive: true,
        });

        return () => {
            window.removeEventListener("touchstart", handleTouchStart);
            window.removeEventListener("touchmove", handleTouchMove);
            window.removeEventListener("touchend", handleTouchEnd);
            window.removeEventListener("touchcancel", handleTouchCancel);
            const content = motionContent.current;

            if (content) {
                content.style.removeProperty("transition");
                content.style.removeProperty("transform");
                content.style.removeProperty("opacity");
                content.style.removeProperty("will-change");
            }

            motionContent.current = null;
            resetTouchState();
            clearMotionResetTimer();
        };
    }, [currentNumber, max, min, readingMode, router]);

    useEffect(() => {
        if (currentNumber > min) {
            router.prefetch(`/quran/${readingMode}/${currentNumber - 1}`);
        }

        if (currentNumber < max) {
            router.prefetch(`/quran/${readingMode}/${currentNumber + 1}`);
        }
    }, [currentNumber, max, min, readingMode, router]);

    function getHref(number: number) {
        return `/quran/${readingMode}/${number}`;
    }

    function submitForm(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const number = Number(inputValue);

        if (!Number.isInteger(number) || number < min || number > max) {
            setInputValue(currentNumber.toString());
            return;
        }

        navigateTo(number);
    }

    return (
        <nav
            className="relative shrink-0 border-t border-primary/15 bg-background/95 backdrop-blur-sm"
            aria-label={`${label} navigation`}
            aria-busy={isNavigating}
        >
            {isNavigating && (
                <span className="absolute inset-x-0 top-0 h-px animate-pulse bg-primary" />
            )}
            <div className="mx-auto flex h-18 max-w-5xl items-center justify-between gap-3 px-4 sm:h-20">
                {currentNumber >= max ? (
                    <Button
                        disabled
                        variant="ghost"
                        className="min-w-25 justify-start text-muted-foreground"
                    >
                        <ArrowLeft aria-hidden="true" />
                        Next
                    </Button>
                ) : (
                    <Button
                        asChild
                        variant="ghost"
                        className="min-w-25 justify-start"
                    >
                        <Link
                            href={getHref(Number(currentNumber) + 1)}
                            onClick={(event) => {
                                if (
                                    event.metaKey ||
                                    event.ctrlKey ||
                                    event.shiftKey ||
                                    event.altKey
                                ) {
                                    return;
                                }

                                event.preventDefault();
                                navigateTo(currentNumber + 1);
                            }}
                        >
                            <ArrowLeft aria-hidden="true" />
                            Next
                        </Link>
                    </Button>
                )}
                {readingMode === "surah" && surahs && surahs.length > 0 ? (
                    <Combobox
                        items={surahs}
                        value={
                            surahs.find(
                                (surah) => surah.number === currentNumber,
                            ) ?? null
                        }
                        disabled={isNavigating}
                        onValueChange={(surah) => {
                            if (surah) navigateTo(surah.number);
                        }}
                        itemToStringValue={(surah) => surah.number.toString()}
                        itemToStringLabel={(surah) =>
                            `${surah.name} ${surah.englishName} ${surah.englishNameTranslation}`
                        }
                        isItemEqualToValue={(surah, selectedSurah) =>
                            surah.number === selectedSurah.number
                        }
                        filter={(surah, query) => {
                            const searchableText = normalizeSurahSearch(
                                `${surah.name} ${surah.englishName} ${surah.englishNameTranslation} ${surah.number}`,
                            );

                            return searchableText.includes(
                                normalizeSurahSearch(query.trim()),
                            );
                        }}
                        autoHighlight
                    >
                        <ComboboxTrigger
                            aria-label="Go to surah"
                            className="flex h-11 w-52 items-center rounded-lg border border-primary/15 bg-card/75 px-3 shadow-xs hover:bg-card sm:w-64"
                        >
                            <span className="flex min-w-0 flex-1 items-center gap-3">
                                <span className="hidden text-xs font-semibold tracking-[0.12em] text-primary uppercase sm:block">
                                    Surah
                                </span>
                                <span
                                    aria-hidden="true"
                                    className="hidden h-5 w-px bg-primary/20 sm:block"
                                />
                                <span
                                    className="surah-name flex-1 truncate text-center text-2xl leading-none text-foreground"
                                    aria-hidden="true"
                                >
                                    {getArabicNumber(currentNumber)}
                                </span>
                            </span>
                        </ComboboxTrigger>
                        <ComboboxContent
                            side="top"
                            align="center"
                            aria-label="Select a surah"
                            className="w-[min(22rem,calc(100vw-2rem))] min-w-0 rounded-xl bg-popover/98 p-1 shadow-xl ring-primary/10 backdrop-blur-md"
                        >
                            <ComboboxInput
                                placeholder="Search surahs…"
                                className="w-auto"
                                showTrigger={false}
                            />
                            <ComboboxEmpty>
                                No matching surahs found.
                            </ComboboxEmpty>
                            <ComboboxList className="max-h-72 p-1">
                                {(surah: SurahType) => (
                                    <ComboboxItem
                                        key={surah.number}
                                        value={surah}
                                        className="rounded-lg px-2 py-2.5 pr-9 data-highlighted:bg-primary/8 data-highlighted:text-foreground"
                                    >
                                        <div className="flex min-w-0 items-center gap-3 pr-2">
                                            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[0.65rem] font-semibold text-primary">
                                                {surah.number}
                                            </span>
                                            <div className="min-w-0">
                                                <p className="surah-name truncate text-2xl leading-none text-foreground">
                                                    {getArabicNumber(
                                                        surah.number,
                                                    )}
                                                </p>
                                                <p className="mt-1 truncate text-xs text-muted-foreground">
                                                    {surah.englishName} ·{" "}
                                                    {
                                                        surah.englishNameTranslation
                                                    }
                                                </p>
                                            </div>
                                        </div>
                                    </ComboboxItem>
                                )}
                            </ComboboxList>
                        </ComboboxContent>
                    </Combobox>
                ) : (
                    <form
                        onSubmit={submitForm}
                        className="flex h-10 items-center gap-1 rounded-lg border border-primary/15 bg-card/70 p-1 shadow-xs"
                    >
                        <label
                            htmlFor="quran-navigation-number"
                            className="hidden px-2 text-xs font-semibold tracking-[0.12em] text-primary uppercase sm:block"
                        >
                            {label}
                        </label>
                        <Input
                            id="quran-navigation-number"
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            required
                            value={inputValue}
                            onChange={(event) =>
                                setInputValue(
                                    event.target.value.replace(/\D/g, ""),
                                )
                            }
                            className="h-8 w-11 rounded-md border-0 bg-muted px-1 text-center text-sm font-semibold shadow-none focus-visible:bg-muted focus-visible:ring-0 sm:w-12"
                            aria-label={`Go to ${label.toLowerCase()}`}
                        />
                        <span className="px-1.5 text-xs text-muted-foreground">
                            {isNavigating ? (
                                <LoaderCircle
                                    aria-hidden="true"
                                    className="size-3.5 animate-spin text-primary"
                                />
                            ) : (
                                `/ ${max}`
                            )}
                        </span>
                    </form>
                )}
                {currentNumber <= min ? (
                    <Button
                        disabled
                        variant="ghost"
                        className="min-w-25 justify-end text-muted-foreground"
                    >
                        Previous
                        <ArrowRight aria-hidden="true" />
                    </Button>
                ) : (
                    <Button
                        asChild
                        variant="ghost"
                        className="min-w-25 justify-end"
                    >
                        <Link
                            href={getHref(Number(currentNumber) - 1)}
                            onClick={(event) => {
                                if (
                                    event.metaKey ||
                                    event.ctrlKey ||
                                    event.shiftKey ||
                                    event.altKey
                                ) {
                                    return;
                                }

                                event.preventDefault();
                                navigateTo(currentNumber - 1);
                            }}
                        >
                            Previous
                            <ArrowRight aria-hidden="true" />
                        </Link>
                    </Button>
                )}
            </div>
        </nav>
    );
}
