"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

export default function ReaderToolbar({ children }: { children: ReactNode }) {
    const t = useTranslations("Reader.controls");

    return (
        <div className="quran-focus-chrome sticky top-2 z-20 mb-4 flex justify-end px-0.5">
            <div
                role="toolbar"
                aria-label={t("label")}
                className="flex min-h-12 max-w-full items-center gap-0.5 overflow-x-auto rounded-2xl bg-background/88 p-1 shadow-[0_10px_30px_-18px_hsl(var(--foreground)/0.45)] ring-1 ring-primary/15 backdrop-blur-xl sm:gap-1"
            >
                {children}
            </div>
        </div>
    );
}
