"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const STORAGE_PREFIX = "quran-reader-position:";
const MAX_BIND_ATTEMPTS = 20;

interface SavedReaderPosition {
    hafsAyah: number;
    scrollTop: number;
}

export default function ReaderPositionTracker() {
    const pathname = usePathname();

    useEffect(() => {
        if (
            !pathname.startsWith("/quran/page/") &&
            !pathname.startsWith("/quran/surah/")
        ) {
            return;
        }

        const storageKey = `${STORAGE_PREFIX}${pathname}`;
        let bindAttempt = 0;
        let bindTimer: number | undefined;
        let animationFrame: number | undefined;
        let cleanupScroll = () => {};

        function savePosition(container: HTMLElement) {
            const ayahs = [
                ...container.querySelectorAll<HTMLElement>(
                    ".ayah[data-hafs-ayah]",
                ),
            ];
            if (ayahs.length === 0) return;

            const containerTop = container.getBoundingClientRect().top;
            const readingLine =
                containerTop + Math.min(150, container.clientHeight * 0.22);
            const closest = ayahs.reduce(
                (best, ayah) => {
                    const distance = Math.abs(
                        ayah.getBoundingClientRect().top - readingLine,
                    );
                    return distance < best.distance ? { ayah, distance } : best;
                },
                { ayah: ayahs[0], distance: Number.POSITIVE_INFINITY },
            );
            const hafsAyah = Number(closest.ayah.dataset.hafsAyah);
            if (!Number.isInteger(hafsAyah)) return;

            const value: SavedReaderPosition = {
                hafsAyah,
                scrollTop: container.scrollTop,
            };
            sessionStorage.setItem(storageKey, JSON.stringify(value));
        }

        function bind() {
            const container = document.querySelector<HTMLElement>(
                "[data-quran-scroll-container]",
            );
            if (!container) {
                if (bindAttempt < MAX_BIND_ATTEMPTS) {
                    bindAttempt += 1;
                    bindTimer = window.setTimeout(bind, 50);
                }
                return;
            }

            if (!window.location.hash) {
                try {
                    const raw = sessionStorage.getItem(storageKey);
                    const saved = raw
                        ? (JSON.parse(raw) as SavedReaderPosition)
                        : null;
                    const target = saved
                        ? container.querySelector<HTMLElement>(
                              `.ayah[data-hafs-ayah="${saved.hafsAyah}"]`,
                          )
                        : null;

                    if (target) {
                        target.scrollIntoView({ block: "center" });
                    } else if (saved?.scrollTop) {
                        container.scrollTop = saved.scrollTop;
                    }
                } catch {
                    sessionStorage.removeItem(storageKey);
                }
            }

            const handleScroll = () => {
                if (animationFrame !== undefined) return;
                animationFrame = window.requestAnimationFrame(() => {
                    animationFrame = undefined;
                    try {
                        savePosition(container);
                    } catch {
                        // Reading must never be interrupted by storage limits.
                    }
                });
            };

            container.addEventListener("scroll", handleScroll, {
                passive: true,
            });
            cleanupScroll = () => {
                container.removeEventListener("scroll", handleScroll);
                try {
                    savePosition(container);
                } catch {
                    // Ignore unavailable session storage.
                }
            };
        }

        bindTimer = window.setTimeout(bind, 0);

        return () => {
            window.clearTimeout(bindTimer);
            if (animationFrame !== undefined) {
                window.cancelAnimationFrame(animationFrame);
            }
            cleanupScroll();
        };
    }, [pathname]);

    return null;
}
