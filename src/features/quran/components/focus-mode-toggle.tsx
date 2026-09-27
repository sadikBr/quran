"use client";

import { Maximize2, Minimize2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export default function FocusModeToggle() {
    const t = useTranslations("Reader.focusMode");
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
        document.body.classList.toggle("focus-mode", isFocused);

        return () => document.body.classList.remove("focus-mode");
    }, [isFocused]);

    return (
        <button
            type="button"
            aria-label={isFocused ? t("disable") : t("enable")}
            aria-pressed={isFocused}
            onClick={() => setIsFocused((current) => !current)}
            className={cn(
                "inline-flex size-9 items-center justify-center rounded-full border border-primary/20 bg-background/85 text-muted-foreground shadow-sm backdrop-blur-sm transition-[background-color,color] hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:size-10",
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
