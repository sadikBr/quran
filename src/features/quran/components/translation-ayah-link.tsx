"use client";

import { useEffect, useRef } from "react";

export default function TranslationAyahLink({
    ayahNumber,
    numberInSurah,
}: {
    ayahNumber: number;
    numberInSurah: number;
}) {
    const timeoutRef = useRef<number | undefined>(undefined);

    useEffect(() => {
        return () => window.clearTimeout(timeoutRef.current);
    }, []);

    function showArabicAyah() {
        const ayah = document.getElementById(`ayah-${ayahNumber}`);

        if (!ayah) return;

        ayah.scrollIntoView({ behavior: "smooth", block: "center" });
        ayah.classList.remove("bg-primary/12", "dark:bg-primary/18");
        ayah.classList.add("bg-primary/12", "dark:bg-primary/18");

        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = window.setTimeout(() => {
            ayah.classList.remove("bg-primary/12", "dark:bg-primary/18");
        }, 900);
    }

    return (
        <button
            type="button"
            onClick={showArabicAyah}
            className="mt-1 flex size-6 items-center justify-center rounded-full bg-primary/10 text-[0.65rem] font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Show Arabic ayah ${numberInSurah}`}
        >
            {numberInSurah}
        </button>
    );
}
