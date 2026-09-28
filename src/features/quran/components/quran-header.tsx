"use client";

import { ArrowRight, BookOpen, LibraryBig, Search } from "lucide-react";
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
        <header className="z-10 shrink-0 border-border/45 border-b bg-background/92 backdrop-blur-xl">
            <a
                href="#quran-reader-main"
                className="sr-only z-50 rounded-md bg-background px-4 py-2 text-sm font-semibold text-foreground shadow-lg focus:not-sr-only focus:absolute focus:start-4 focus:top-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
                {t("header.skipToReader")}
            </a>
            <div className="mx-auto flex h-[calc(4.25rem+env(safe-area-inset-top))] max-w-5xl items-center justify-between gap-3 px-3 pt-[env(safe-area-inset-top)] sm:h-[calc(4.75rem+env(safe-area-inset-top))] sm:px-4">
                <Link
                    href="/"
                    className="group flex min-w-0 items-center gap-3 rounded-xl outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
                >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/15 transition-transform group-hover:-rotate-3">
                        <BookOpen aria-hidden="true" className="size-5" />
                    </span>
                    <span className="hidden min-w-0 min-[430px]:block">
                        <span className="block truncate text-sm font-semibold text-foreground">
                            {t("header.brand")}
                        </span>
                        <span className="mt-0.5 block text-[0.65rem] font-medium tracking-[0.12em] text-muted-foreground uppercase">
                            {t("header.readerLabel")}
                        </span>
                    </span>
                </Link>
                <nav
                    aria-label={t("header.navigation")}
                    className="flex min-w-0 shrink-0 items-center gap-1 rounded-2xl bg-muted/35 p-1 text-sm ring-1 ring-border/40"
                >
                    {riwayah && (
                        <span className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-primary/8 px-2.5 text-xs font-semibold text-primary">
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
                        className="inline-flex size-9 items-center justify-center gap-2 rounded-xl text-muted-foreground transition-colors hover:bg-background/75 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-auto sm:px-3"
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
                            className="inline-flex size-9 items-center justify-center gap-2 rounded-xl text-muted-foreground transition-colors hover:bg-background/75 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-[560px]:w-auto min-[560px]:px-3"
                        >
                            <LibraryBig aria-hidden="true" className="size-4" />
                            <span className="hidden min-[560px]:inline">
                                {t("header.surahIndex")}
                            </span>
                            <span className="sr-only min-[560px]:hidden">
                                {t("header.surahIndex")}
                            </span>
                        </Link>
                    )}
                    {startReadingHref && (
                        <Link
                            href={startReadingHref}
                            className="group inline-flex size-9 items-center justify-center gap-1.5 rounded-xl bg-primary font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-auto sm:px-3"
                        >
                            <span className="hidden sm:inline">
                                {startReadingLabel ??
                                    t(
                                        hasSavedProgress
                                            ? "header.continueReading"
                                            : "header.startReading",
                                    )}
                            </span>
                            <span className="sr-only sm:hidden">
                                {startReadingLabel ??
                                    t(
                                        hasSavedProgress
                                            ? "header.continueReading"
                                            : "header.startReading",
                                    )}
                            </span>
                            <ArrowRight
                                aria-hidden="true"
                                className={cn(
                                    "size-4 transition-transform group-hover:translate-x-0.5",
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
