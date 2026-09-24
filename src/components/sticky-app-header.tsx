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
            className={cn(
                "sticky top-0 z-20 flex h-20 items-center justify-between gap-4 transition-[background-color,backdrop-filter] duration-200",
                hasScrolled && "bg-background/85 backdrop-blur-sm",
                className,
            )}
        >
            {children}
        </header>
    );
}
