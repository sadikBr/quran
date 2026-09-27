"use client";

import { ArrowRight, BookOpen, Search } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import type { Riwayah } from "@/features/settings/preferences";
import { cn } from "@/lib/utils";

export default function QuranHeader({
    startReadingHref,
    startReadingLabel,
    hasSavedProgress = false,
    showSurahIndex,
    riwayah,
}: {
    startReadingHref?: string;
    startReadingLabel?: string;
    hasSavedProgress?: boolean;
    showSurahIndex?: boolean;
    riwayah?: Riwayah;
}) {
    const t = useTranslations("Reader");
    const locale = useLocale();

    return (
        <header className="z-10 shrink-0 bg-background/85 backdrop-blur-sm">
            <a
                href="#quran-reader-main"
                className="sr-only z-50 rounded-md bg-background px-4 py-2 text-sm font-semibold text-foreground shadow-lg focus:not-sr-only focus:absolute focus:start-4 focus:top-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
                {t("header.skipToReader")}
            </a>
            <div className="mx-auto flex h-20 max-w-5xl items-center justify-between gap-4 px-4">
                <Link
                    href="/"
                    className="group flex min-w-0 items-center gap-3 rounded-md text-sm font-semibold tracking-wide outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
                >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm transition-transform group-hover:-rotate-3">
                        <BookOpen aria-hidden="true" className="size-5" />
                    </span>
                    <span className="hidden truncate text-foreground min-[360px]:block">
                        {t("header.brand")}
                    </span>
                </Link>
                <nav
                    aria-label={t("header.navigation")}
                    className="flex shrink-0 items-center gap-3 text-sm"
                >
                    {riwayah && (
                        <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-primary/8 px-2.5 text-xs font-semibold text-primary ring-1 ring-primary/15">
                            <span className="sr-only">
                                {t("header.riwayahLabel", {
                                    riwayah: t(`header.${riwayah}`),
                                })}
                            </span>
                            <span
                                aria-hidden="true"
                                className="size-1.5 rounded-full bg-primary shadow-[0_0_0_3px_color-mix(in_oklab,var(--primary)_14%,transparent)]"
                            />
                            <span aria-hidden="true">
                                {t(`header.${riwayah}`)}
                            </span>
                        </span>
                    )}
                    <Link
                        href="/quran/search"
                        title={t("header.search")}
                        className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        <Search aria-hidden="true" className="size-4" />
                        <span className="hidden sm:inline">
                            {t("header.search")}
                        </span>
                        <span className="sr-only sm:hidden">
                            {t("header.search")}
                        </span>
                    </Link>
                    {showSurahIndex && (
                        <Link
                            href="/quran"
                            className="text-muted-foreground transition-colors hover:text-foreground focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            {t("header.surahIndex")}
                        </Link>
                    )}
                    {(showSurahIndex || startReadingHref) && (
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
