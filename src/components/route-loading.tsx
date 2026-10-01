"use client";

import { BookOpen } from "lucide-react";
import { useTranslations } from "next-intl";
import PageBackground from "@/components/page-background";

export default function RouteLoading() {
    const t = useTranslations("Common.loading");

    return (
        <main
            aria-busy="true"
            aria-live="polite"
            className="relative isolate min-h-dvh overflow-hidden bg-background"
        >
            <PageBackground />
            <p className="sr-only">{t("page")}</p>
            <div className="mx-auto max-w-6xl px-4 motion-safe:animate-pulse sm:px-6">
                <header className="flex h-16 items-center justify-between border-border/30 border-b sm:h-20">
                    <div className="flex items-center gap-3">
                        <span className="flex size-9 items-center justify-center rounded-xl bg-primary/12 text-primary">
                            <BookOpen aria-hidden="true" className="size-4" />
                        </span>
                        <span className="h-3 w-28 rounded-full bg-muted" />
                    </div>
                    <span className="size-10 rounded-full bg-muted" />
                </header>
                <section className="py-10 sm:py-14">
                    <div className="h-3 w-28 rounded-full bg-primary/15" />
                    <div className="mt-4 h-10 w-4/5 max-w-xl rounded-xl bg-muted" />
                    <div className="mt-4 h-5 w-full max-w-2xl rounded-lg bg-muted/70" />
                    <div className="mt-10 overflow-hidden rounded-2xl border border-border/50 bg-card/35 p-4 sm:p-6">
                        <div className="h-40 rounded-2xl bg-primary/[0.055]" />
                    </div>
                    <div className="mt-10 grid gap-3 rounded-2xl bg-muted/25 p-2 ring-1 ring-border/40 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="h-28 rounded-xl bg-muted/55" />
                        <div className="h-28 rounded-xl bg-muted/45" />
                        <div className="h-28 rounded-xl bg-muted/35 sm:col-span-2 lg:col-span-1" />
                    </div>
                </section>
            </div>
        </main>
    );
}
