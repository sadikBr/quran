"use client";

import { useTranslations } from "next-intl";
import PageBackground from "@/components/page-background";

export default function WirdLoading() {
    const t = useTranslations("Wird.loading");

    return (
        <main
            aria-busy="true"
            aria-live="polite"
            className="relative isolate min-h-dvh overflow-hidden bg-background"
        >
            <PageBackground />
            <p className="sr-only">{t("overview")}</p>
            <div className="app-container motion-safe:animate-pulse">
                <header className="flex h-20 items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="size-9 rounded-lg bg-primary/20" />
                        <div className="h-3 w-28 rounded bg-muted" />
                    </div>
                    <div className="size-10 rounded-full bg-muted" />
                </header>

                <section className="py-10 sm:py-14">
                    <div className="h-4 w-32 rounded bg-muted" />
                    <div className="mt-9 max-w-2xl space-y-4">
                        <div className="h-3 w-28 rounded bg-primary/15" />
                        <div className="h-10 w-3/4 max-w-lg rounded-lg bg-muted" />
                        <div className="h-5 w-full rounded bg-muted/80" />
                        <div className="h-5 w-5/6 rounded bg-muted/80" />
                    </div>

                    <div className="mt-10 rounded-2xl bg-muted/45 p-5 ring-1 ring-primary/10 sm:p-8">
                        <div className="flex flex-col gap-6 sm:flex-row sm:justify-between">
                            <div className="space-y-4">
                                <div className="h-4 w-32 rounded bg-primary/15" />
                                <div className="h-12 w-56 max-w-full rounded-lg bg-muted" />
                                <div className="h-6 w-72 max-w-full rounded bg-muted/80" />
                            </div>
                            <div className="h-8 w-28 rounded-full bg-muted" />
                        </div>
                        <div className="mt-7 h-4 w-4/5 rounded bg-muted/80" />
                        <div className="mt-6 flex gap-3">
                            <div className="h-10 w-36 rounded-lg bg-primary/20" />
                            <div className="h-10 w-32 rounded-lg bg-muted" />
                        </div>
                    </div>

                    <div className="mt-12 grid gap-6 lg:grid-cols-2">
                        <div className="h-72 rounded-2xl bg-muted/40 ring-1 ring-primary/8" />
                        <div className="h-72 rounded-2xl bg-muted/30 ring-1 ring-primary/8" />
                    </div>
                </section>
            </div>
        </main>
    );
}
