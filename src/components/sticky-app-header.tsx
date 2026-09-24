"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export default function StickyAppHeader({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    const [hasScrolled, setHasScrolled] = useState(false);

    useEffect(() => {
        const updateScrollState = () => setHasScrolled(window.scrollY > 4);

        updateScrollState();
        window.addEventListener("scroll", updateScrollState, { passive: true });

        return () => window.removeEventListener("scroll", updateScrollState);
    }, []);

    return (
        <header
            data-scrolled={hasScrolled}
            className={cn(
                "sticky top-0 z-20 isolate flex h-20 items-center justify-between gap-4",
                hasScrolled &&
                    "before:absolute before:inset-y-0 before:left-1/2 before:-z-10 before:w-screen before:-translate-x-1/2 before:bg-background/85 before:backdrop-blur-md before:content-['']",
                className,
            )}
        >
            {children}
        </header>
    );
}
