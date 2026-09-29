"use client";

import { type ReactNode, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import AppLogo from "./app-logo";
import AppPrimaryNav from "./app-primary-nav";

export default function StickyAppHeader({
    children,
    className,
    navigation = false,
}: {
    children?: ReactNode;
    className?: string;
    navigation?: boolean;
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
                "sticky top-0 z-40 isolate flex h-[calc(4rem+env(safe-area-inset-top))] items-center justify-between gap-3 pt-[env(safe-area-inset-top)] sm:h-[calc(5rem+env(safe-area-inset-top))] sm:gap-4 [&>a]:min-w-0 [&>a>span:last-child]:truncate",
                hasScrolled &&
                    "before:absolute before:inset-y-0 before:left-1/2 before:-z-10 before:w-screen before:-translate-x-1/2 before:border-border/35 before:border-b before:bg-background/88 before:shadow-sm before:backdrop-blur-md before:content-['']",
                className,
            )}
        >
            {navigation ? (
                <>
                    <AppPrimaryNav />
                    <AppLogo />
                </>
            ) : (
                children
            )}
        </header>
    );
}
