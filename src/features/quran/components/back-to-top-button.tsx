"use client";

import { ArrowUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export default function BackToTopButton({
    embedded = false,
}: {
    embedded?: boolean;
}) {
    const t = useTranslations("Reader");
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        let removeScrollListener = () => {};

        const bindScrollContainer = () => {
            removeScrollListener();
            const scrollContainer = document.querySelector<HTMLElement>(
                "[data-quran-scroll-container]",
            );
            if (!scrollContainer) {
                setIsVisible(false);
                return;
            }

            const updateVisibility = () => {
                setIsVisible(scrollContainer.scrollTop > 360);
            };
            updateVisibility();
            scrollContainer.addEventListener("scroll", updateVisibility, {
                passive: true,
            });
            removeScrollListener = () =>
                scrollContainer.removeEventListener("scroll", updateVisibility);
        };

        bindScrollContainer();
        const observer = new MutationObserver(bindScrollContainer);
        observer.observe(document.querySelector("main") ?? document.body, {
            childList: true,
            subtree: true,
        });

        return () => {
            observer.disconnect();
            removeScrollListener();
        };
    }, []);

    function scrollToTop() {
        const scrollContainer = document.querySelector<HTMLElement>(
            "[data-quran-scroll-container]",
        );
        scrollContainer?.scrollTo({
            top: 0,
            behavior:
                embedded ||
                window.matchMedia("(prefers-reduced-motion: reduce)").matches
                    ? "auto"
                    : "smooth",
        });
    }

    return (
        <button
            type="button"
            onClick={scrollToTop}
            aria-label={t("backToTop")}
            aria-hidden={!isVisible}
            hidden={embedded && !isVisible}
            tabIndex={isVisible ? 0 : -1}
            className={cn(
                "flex size-10 items-center justify-center text-primary transition-[opacity,transform,background-color,color] duration-200 hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                embedded
                    ? "shrink-0 rounded-xl bg-transparent"
                    : "fixed end-5 bottom-20 z-20 translate-y-2 rounded-full border border-primary/20 bg-background/90 opacity-0 shadow-md backdrop-blur-sm focus-visible:translate-y-0 focus-visible:opacity-100 sm:end-7 sm:bottom-24 sm:size-11",
            )}
            style={
                isVisible
                    ? embedded
                        ? undefined
                        : { opacity: 1, transform: "translateY(0)" }
                    : undefined
            }
        >
            <ArrowUp aria-hidden="true" className="size-4" />
        </button>
    );
}
