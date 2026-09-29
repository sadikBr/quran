"use client";

import { LibraryBig } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import AppLogo from "@/components/app-logo";
import AppPrimaryNav from "@/components/app-primary-nav";
import type { Riwayah } from "@/features/settings/preferences";

export default function QuranHeader({
    showSurahIndex,
    riwayah,
}: {
    showSurahIndex?: boolean;
    riwayah?: Riwayah;
}) {
    const t = useTranslations("Reader");

    return (
        <header className="z-10 shrink-0 border-border/45 border-b bg-background/92 backdrop-blur-xl">
            <a
                href="#quran-reader-main"
                className="sr-only z-50 rounded-md bg-background px-4 py-2 text-sm font-semibold text-foreground shadow-lg focus:not-sr-only focus:absolute focus:start-4 focus:top-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
                {t("header.skipToReader")}
            </a>
            <div className="mx-auto flex h-[calc(4rem+env(safe-area-inset-top))] max-w-5xl items-center justify-between gap-3 px-3 pt-[env(safe-area-inset-top)] sm:h-[calc(5rem+env(safe-area-inset-top))] sm:px-4">
                <AppPrimaryNav />
                {(riwayah || showSurahIndex) && (
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
                        {showSurahIndex && (
                            <Link
                                href="/quran"
                                className="inline-flex size-9 items-center justify-center gap-2 rounded-xl text-muted-foreground transition-colors hover:bg-background/75 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-[560px]:w-auto min-[560px]:px-3"
                            >
                                <LibraryBig
                                    aria-hidden="true"
                                    className="size-4"
                                />
                                <span className="hidden min-[560px]:inline">
                                    {t("header.surahIndex")}
                                </span>
                                <span className="sr-only min-[560px]:hidden">
                                    {t("header.surahIndex")}
                                </span>
                            </Link>
                        )}
                    </nav>
                )}
                <AppLogo />
            </div>
        </header>
    );
}
