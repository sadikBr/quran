"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import showArabicAyah from "../helpers/show-arabic-ayah";

export default function TranslationAyahLink({
    ayahNumber,
    numberInSurah,
}: {
    ayahNumber: number;
    numberInSurah: number;
}) {
    const t = useTranslations("Reader");
    const clearHighlightRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        return () => clearHighlightRef.current?.();
    }, []);

    function revealArabicAyah() {
        clearHighlightRef.current?.();
        clearHighlightRef.current = showArabicAyah(ayahNumber);
    }

    return (
        <button
            type="button"
            onClick={revealArabicAyah}
            className="mt-1 flex size-6 items-center justify-center rounded-full bg-primary/10 text-[0.65rem] font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={t("ayah.showArabic", { number: numberInSurah })}
        >
            {numberInSurah}
        </button>
    );
}
