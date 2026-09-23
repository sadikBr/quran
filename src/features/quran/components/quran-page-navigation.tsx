"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ReadingMode } from "@/features/settings/preferences";
import QuranInfo from "@/lib/quran-info";

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
}: {
    currentNumber: number;
    readingMode: ReadingMode;
}) {
    const [inputValue, setInputValue] = useState(currentNumber.toString());
    const router = useRouter();
    const { label, min, max } = navigationDetails[readingMode];

    useEffect(() => {
        setInputValue(currentNumber.toString());
    }, [currentNumber]);

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

        router.push(getHref(number));
    }

    return (
        <nav
            className="shrink-0 border-t border-primary/15 bg-background/95 backdrop-blur-sm"
            aria-label={`${label} navigation`}
        >
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
                        <Link href={getHref(Number(currentNumber) - 1)}>
                            <ArrowLeft aria-hidden="true" />
                            Previous
                        </Link>
                    </Button>
                )}
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
                            setInputValue(event.target.value.replace(/\D/g, ""))
                        }
                        className="h-8 w-11 rounded-md border-0 bg-muted px-1 text-center text-sm font-semibold shadow-none focus-visible:bg-muted focus-visible:ring-0 sm:w-12"
                        aria-label={`Go to ${label.toLowerCase()}`}
                    />
                    <span className="px-1.5 text-xs text-muted-foreground">
                        / {max}
                    </span>
                </form>
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
                        <Link href={getHref(Number(currentNumber) + 1)}>
                            Next
                            <ArrowRight aria-hidden="true" />
                        </Link>
                    </Button>
                )}
            </div>
        </nav>
    );
}
