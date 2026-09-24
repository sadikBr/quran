"use client";

import { ArrowLeft, ArrowRight, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
} from "@/components/ui/select";
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
    const router = useRouter();
    const { label, min, max } = navigationDetails[readingMode];

    useEffect(() => {
        setInputValue(currentNumber.toString());
        setIsNavigating(false);
    }, [currentNumber]);

    function navigateTo(number: number) {
        setIsNavigating(true);
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

            if (event.key === "ArrowLeft" && currentNumber > min) {
                event.preventDefault();
                setIsNavigating(true);
                router.push(`/quran/${readingMode}/${currentNumber - 1}`);
            }

            if (event.key === "ArrowRight" && currentNumber < max) {
                event.preventDefault();
                setIsNavigating(true);
                router.push(`/quran/${readingMode}/${currentNumber + 1}`);
            }
        }

        window.addEventListener("keydown", handleKeyDown);

        return () => window.removeEventListener("keydown", handleKeyDown);
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
                {currentNumber <= min ? (
                    <Button
                        disabled
                        variant="ghost"
                        className="min-w-25 justify-start text-muted-foreground"
                    >
                        <ArrowLeft aria-hidden="true" />
                        Previous
                    </Button>
                ) : (
                    <Button
                        asChild
                        variant="ghost"
                        className="min-w-25 justify-start"
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
                            <ArrowLeft aria-hidden="true" />
                            Previous
                        </Link>
                    </Button>
                )}
                {readingMode === "surah" && surahs && surahs.length > 0 ? (
                    <Select
                        value={currentNumber.toString()}
                        disabled={isNavigating}
                        onValueChange={(value) => navigateTo(Number(value))}
                    >
                        <SelectTrigger
                            aria-label="Go to surah"
                            className="h-11 w-52 border-primary/15 bg-card/75 px-3 shadow-xs hover:bg-card sm:w-64"
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
                        </SelectTrigger>
                        <SelectContent
                            position="popper"
                            side="top"
                            className="w-80 max-h-80 rounded-xl border-primary/15 bg-popover/95 p-2 shadow-xl backdrop-blur"
                        >
                            {surahs.map((surah) => (
                                <SelectItem
                                    key={surah.number}
                                    value={surah.number.toString()}
                                    className="rounded-lg py-2.5 pr-8 focus:bg-primary/8 focus:text-foreground"
                                >
                                    <div className="flex min-w-0 items-center gap-3 pr-2">
                                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[0.65rem] font-semibold text-primary">
                                            {surah.number}
                                        </span>
                                        <div className="min-w-0">
                                            <p className="surah-name truncate text-2xl leading-none text-foreground">
                                                {getArabicNumber(surah.number)}
                                            </p>
                                            <p className="mt-1 truncate text-xs text-muted-foreground">
                                                {surah.englishName} ·{" "}
                                                {surah.englishNameTranslation}
                                            </p>
                                        </div>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
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
                {currentNumber >= max ? (
                    <Button
                        disabled
                        variant="ghost"
                        className="min-w-25 justify-end text-muted-foreground"
                    >
                        Next
                        <ArrowRight aria-hidden="true" />
                    </Button>
                ) : (
                    <Button
                        asChild
                        variant="ghost"
                        className="min-w-25 justify-end"
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
                            Next
                            <ArrowRight aria-hidden="true" />
                        </Link>
                    </Button>
                )}
            </div>
        </nav>
    );
}
