"use client";

import { useTranslations } from "next-intl";
import PageBackground from "@/components/page-background";

export default function PracticeLoading() {
    const t = useTranslations("Practice.loading");

    return (
        <main
            aria-busy="true"
            aria-live="polite"
            className="relative isolate min-h-dvh overflow-hidden bg-background"
        >
            <PageBackground />
            <p className="sr-only">{t("overview")}</p>
            <div className="mx-auto max-w-5xl px-4 motion-safe:animate-pulse">
                <header className="flex h-20 items-center justify-between">
                    <div className="h-9 w-36 rounded-lg bg-muted" />
                    <div className="size-10 rounded-full bg-muted" />
                </header>
                <section className="py-12">
                    <div className="h-3 w-32 rounded bg-primary/15" />
                    <div className="mt-4 h-10 w-2/3 rounded-lg bg-muted" />
                    <div className="mt-5 h-5 w-full max-w-2xl rounded bg-muted/70" />
                    <div className="mt-10 h-44 rounded-3xl bg-primary/[0.07] ring-1 ring-primary/10" />
                    <div className="mt-10 h-96 max-w-3xl rounded-3xl bg-muted/40 ring-1 ring-border/40" />
                </section>
            </div>
        </main>
    );
}
