"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import showArabicAyah from "../helpers/show-arabic-ayah";

const AYAH_HASH_PATTERN = /^#ayah-(\d+)$/;
const MAX_FIND_ATTEMPTS = 20;

export default function AyahTargetScroller() {
    const pathname = usePathname();

    useEffect(() => {
        if (!pathname.startsWith("/quran/")) return;

        let findAttempt = 0;
        let retryTimer: number | undefined;
        let clearHighlight: (() => void) | null = null;

        function revealTargetAyah() {
            window.clearTimeout(retryTimer);
            const match = window.location.hash.match(AYAH_HASH_PATTERN);

            if (!match) return;

            const ayahNumber = Number(match[1]);
            clearHighlight?.();
            clearHighlight = showArabicAyah(ayahNumber);

            if (clearHighlight) {
                const url = new URL(window.location.href);
                url.hash = "";
                window.history.replaceState(
                    window.history.state,
                    "",
                    `${url.pathname}${url.search}`,
                );
                return;
            }

            if (!clearHighlight && findAttempt < MAX_FIND_ATTEMPTS) {
                findAttempt += 1;
                retryTimer = window.setTimeout(revealTargetAyah, 50);
            }
        }

        const animationFrame = window.requestAnimationFrame(revealTargetAyah);
        window.addEventListener("hashchange", revealTargetAyah);

        return () => {
            window.cancelAnimationFrame(animationFrame);
            window.clearTimeout(retryTimer);
            window.removeEventListener("hashchange", revealTargetAyah);
            clearHighlight?.();
        };
    }, [pathname]);

    return null;
}
