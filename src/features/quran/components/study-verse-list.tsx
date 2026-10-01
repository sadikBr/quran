"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { SimilarVerse } from "../study-types";
import QuranText from "./quran-text";

export default function StudyVerseList({ verses }: { verses: SimilarVerse[] }) {
    const t = useTranslations("Reader.study");
    const locale = useLocale();
    const [visibleCount, setVisibleCount] = useState(12);
    return (
        <div className="space-y-4">
            {verses.slice(0, visibleCount).map((verse) => (
                <article
                    key={verse.globalNumber}
                    className="app-card p-4 sm:p-5"
                >
                    <p
                        dir="rtl"
                        lang="ar"
                        className="quran-display-text text-center text-xl leading-[2.2] [overflow-wrap:anywhere]"
                    >
                        <QuranText text={verse.text} />
                    </p>
                    <a
                        href={`/quran/surah/${verse.surah}#ayah-${verse.globalNumber}`}
                        className="mt-3 inline-flex min-h-11 flex-wrap items-center gap-2 text-sm font-medium text-primary underline-offset-4 hover:underline"
                    >
                        {locale === "ar"
                            ? verse.surahName
                            : verse.surahEnglishName}{" "}
                        · {verse.surah}:{verse.ayah}
                        <span className="text-xs text-muted-foreground">
                            {t("readVerse")}
                        </span>
                    </a>
                </article>
            ))}
            {verses.length > visibleCount && (
                <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setVisibleCount((value) => value + 12)}
                >
                    {t("showMore")}
                </Button>
            )}
        </div>
    );
}
