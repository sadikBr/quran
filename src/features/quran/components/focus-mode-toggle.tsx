"use client";

import { Maximize2, Minimize2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export default function FocusModeToggle({
    embedded = false,
}: {
    embedded?: boolean;
}) {
    const t = useTranslations("Reader.focusMode");
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
        document.body.classList.toggle("focus-mode", isFocused);

        return () => document.body.classList.remove("focus-mode");
    }, [isFocused]);

    function toggleFocusMode() {
        const nextIsFocused = !isFocused;
        setIsFocused(nextIsFocused);
        window.dispatchEvent(
            new CustomEvent("quran-focus-mode-change", {
                detail: nextIsFocused,
            }),
        );
    }

    return (
        <button
            type="button"
            aria-label={isFocused ? t("disable") : t("enable")}
            title={isFocused ? t("disable") : t("enable")}
            aria-pressed={isFocused}
            onClick={toggleFocusMode}
            className={cn(
                "inline-flex size-10 shrink-0 items-center justify-center text-muted-foreground transition-[background-color,color] hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                embedded
                    ? "rounded-xl bg-transparent"
                    : "rounded-full border border-primary/20 bg-background/85 shadow-sm backdrop-blur-sm",
                isFocused && "bg-primary text-primary-foreground",
            )}
        >
            {isFocused ? (
                <Minimize2 aria-hidden="true" className="size-4" />
            ) : (
                <Maximize2 aria-hidden="true" className="size-4" />
            )}
        </button>
    );
}
