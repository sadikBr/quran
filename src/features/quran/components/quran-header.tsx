"use client";

import { ArrowRight, BookOpen } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export default function QuranHeader({
    startReadingHref,
    startReadingLabel,
    hasSavedProgress = false,
    showSurahIndex,
}: {
    startReadingHref?: string;
    startReadingLabel?: string;
    hasSavedProgress?: boolean;
    showSurahIndex?: boolean;
}) {
    const t = useTranslations("Reader");
    const locale = useLocale();

    return (
        <header className="z-10 shrink-0 bg-background/85 backdrop-blur-sm">
            <div className="mx-auto flex h-20 max-w-5xl items-center justify-between gap-4 px-4">
                <Link
                    href="/"
                    className="group flex min-w-0 items-center gap-3 rounded-md text-sm font-semibold tracking-wide outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
                >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm transition-transform group-hover:-rotate-3">
                        <BookOpen aria-hidden="true" className="size-5" />
                    </span>
                    <span className="truncate text-foreground">
                        {t("header.brand")}
                    </span>
                </Link>
                <nav
                    aria-label={t("header.navigation")}
                    className="flex shrink-0 items-center gap-3 text-sm"
                >
                    {showSurahIndex && (
                        <Link
                            href="/quran"
                            className="text-muted-foreground transition-colors hover:text-foreground focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            {t("header.surahIndex")}
                        </Link>
                    )}
                    {showSurahIndex && startReadingHref && (
                        <span aria-hidden="true" className="text-border">
                            ·
                        </span>
                    )}
                    {startReadingHref && (
                        <Link
                            href={startReadingHref}
                            className="group inline-flex items-center gap-1.5 font-semibold text-primary transition-colors hover:text-foreground focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            {startReadingLabel ??
                                t(
                                    hasSavedProgress
                                        ? "header.continueReading"
                                        : "header.startReading",
                                )}
                            <ArrowRight
                                aria-hidden="true"
                                className={cn(
                                    "size-3.5 transition-transform group-hover:translate-x-0.5",
                                    locale === "ar" && "rotate-180",
                                )}
                            />
                        </Link>
                    )}
                </nav>
            </div>
        </header>
    );
}
