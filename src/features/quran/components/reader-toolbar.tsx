"use client";

import { AudioLines } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import BackToTopButton from "./back-to-top-button";

export default function ReaderToolbar({ children }: { children: ReactNode }) {
    const t = useTranslations("Reader.controls");
    const locale = useLocale();
    const [isOpen, setIsOpen] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const panelId = useId();
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setIsMounted(true);

        function closeOnOutsidePointer(event: PointerEvent) {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        }

        function closeOnEscape(event: KeyboardEvent) {
            if (event.key === "Escape") setIsOpen(false);
        }

        function closeForFocusMode() {
            setIsOpen(false);
        }

        document.addEventListener("pointerdown", closeOnOutsidePointer);
        document.addEventListener("keydown", closeOnEscape);
        window.addEventListener("quran-focus-mode-change", closeForFocusMode);

        return () => {
            document.removeEventListener("pointerdown", closeOnOutsidePointer);
            document.removeEventListener("keydown", closeOnEscape);
            window.removeEventListener(
                "quran-focus-mode-change",
                closeForFocusMode,
            );
        };
    }, []);

    if (!isMounted) return null;

    return createPortal(
        <div
            ref={containerRef}
            dir="ltr"
            onPointerEnter={(event) => {
                if (event.pointerType === "mouse") setIsOpen(true);
            }}
            onPointerLeave={(event) => {
                if (
                    event.pointerType === "mouse" &&
                    !containerRef.current?.contains(document.activeElement)
                ) {
                    setIsOpen(false);
                }
            }}
            onBlurCapture={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                    setIsOpen(false);
                }
            }}
            className="fixed right-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 flex items-center gap-2 opacity-55 transition-opacity duration-300 hover:opacity-100 focus-within:opacity-100 sm:right-6 sm:bottom-[calc(5.25rem+env(safe-area-inset-bottom))]"
        >
            <div
                id={panelId}
                dir={locale === "ar" ? "rtl" : "ltr"}
                role="toolbar"
                aria-label={t("label")}
                hidden={!isOpen}
                className="flex min-h-13 max-w-[calc(100vw-1.5rem)] animate-in items-center gap-1 overflow-x-auto rounded-2xl bg-card/95 p-1.5 shadow-[0_18px_45px_-18px_hsl(var(--foreground)/0.55)] ring-1 ring-border/65 backdrop-blur-xl fade-in-0 zoom-in-95 slide-in-from-bottom-2"
            >
                {children}
                <BackToTopButton embedded />
            </div>
            <button
                type="button"
                aria-label={isOpen ? t("close") : t("open")}
                title={isOpen ? t("close") : t("open")}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setIsOpen((open) => !open)}
                className="inline-flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_10px_28px_-10px_hsl(var(--primary)/0.8)] ring-1 ring-primary-foreground/15 transition-[transform,background-color] hover:scale-105 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 pointer-coarse:size-12"
            >
                <AudioLines aria-hidden="true" className="size-5" />
            </button>
        </div>,
        document.body,
    );
}
