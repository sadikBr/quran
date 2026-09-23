"use client";

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

        router.push(getHref(Number(inputValue)));
    }

    return (
        <div className="border-t">
            <div className="mx-auto flex max-w-5xl items-center justify-between p-4">
                {currentNumber <= min ? (
                    <Button disabled variant="outline">
                        Previous
                    </Button>
                ) : (
                    <Button asChild variant="outline">
                        <Link href={getHref(Number(currentNumber) - 1)}>
                            Previous
                        </Link>
                    </Button>
                )}
                <form onSubmit={submitForm}>
                    <Input
                        type="number"
                        required
                        value={inputValue}
                        onChange={(event) => setInputValue(event.target.value)}
                        min={min}
                        step={1}
                        max={max}
                        className="w-18"
                        aria-label={`Go to ${label.toLowerCase()}`}
                    />
                </form>
                {currentNumber >= max ? (
                    <Button disabled variant="outline">
                        Next
                    </Button>
                ) : (
                    <Button asChild variant="outline">
                        <Link href={getHref(Number(currentNumber) + 1)}>
                            Next
                        </Link>
                    </Button>
                )}
            </div>
        </div>
    );
}
