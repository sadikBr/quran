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
            <div className="mx-auto max-w-5xl px-4 motion-safe:animate-pulse">
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
                    <div className="mt-10 grid gap-4 sm:grid-cols-2">
                        <div className="h-52 rounded-3xl bg-primary/[0.055] ring-1 ring-primary/10" />
                        <div className="h-52 rounded-3xl bg-muted/40 ring-1 ring-border/40" />
                    </div>
                    <div className="mt-8 h-72 rounded-3xl bg-muted/30 ring-1 ring-border/40" />
                </section>
            </div>
        </main>
    );
}
