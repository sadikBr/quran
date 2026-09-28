"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const NAVIGATION_TIMEOUT = 10000;

export default function NavigationFeedback() {
    const pathname = usePathname();
    const [isNavigating, setIsNavigating] = useState(false);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        void pathname;
        setIsNavigating(false);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }, [pathname]);

    useEffect(() => {
        function beginNavigation(event: MouseEvent) {
            if (
                event.defaultPrevented ||
                event.button !== 0 ||
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
            ) {
                return;
            }

            const target = event.target;
            if (!(target instanceof Element)) return;
            const anchor = target.closest("a");
            if (
                !anchor ||
                anchor.target === "_blank" ||
                anchor.hasAttribute("download")
            ) {
                return;
            }

            const url = new URL(anchor.href, window.location.href);
            if (
                url.origin !== window.location.origin ||
                url.pathname === window.location.pathname
            ) {
                return;
            }

            setIsNavigating(true);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(
                () => setIsNavigating(false),
                NAVIGATION_TIMEOUT,
            );
        }

        document.addEventListener("click", beginNavigation, true);
        return () => {
            document.removeEventListener("click", beginNavigation, true);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    if (!isNavigating) return null;

    return (
        <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 overflow-hidden bg-primary/15"
        >
            <span className="block h-full w-1/3 animate-navigation-progress bg-primary shadow-[0_0_12px_var(--primary)]" />
        </div>
    );
}
