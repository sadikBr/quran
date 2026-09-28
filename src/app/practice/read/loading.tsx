"use client";

import { useTranslations } from "next-intl";

export default function PracticeReaderLoading() {
    const t = useTranslations("Practice.loading");

    return (
        <main
            aria-busy="true"
            aria-live="polite"
            className="min-h-dvh bg-background"
        >
            <p className="sr-only">{t("reader")}</p>
            <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-3 sm:px-5">
                <div className="h-8 w-28 rounded-full bg-muted" />
                <div className="h-5 w-32 rounded bg-muted" />
            </div>
            <div className="mx-auto max-w-4xl px-3 motion-safe:animate-pulse sm:px-5">
                <div className="flex min-h-16 items-center justify-between gap-4 border-border/45 border-y py-2">
                    <div className="flex flex-1 items-center gap-3">
                        <div className="h-6 w-10 rounded bg-primary/15" />
                        <div className="h-7 w-px bg-border/60" />
                        <div className="space-y-2">
                            <div className="h-2.5 w-28 rounded bg-primary/15" />
                            <div className="h-3 w-40 rounded bg-muted" />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <div className="size-9 rounded-full bg-muted" />
                        <div className="h-9 w-32 rounded-full bg-muted" />
                    </div>
                </div>
                <div className="mt-10 flex items-center gap-4">
                    <div className="h-px flex-1 bg-muted" />
                    <div className="h-10 w-36 rounded bg-muted" />
                    <div className="h-px flex-1 bg-muted" />
                </div>
                <div className="mt-6 space-y-4">
                    {[0, 1, 2].map((item) => (
                        <div
                            key={item}
                            className="h-48 rounded-2xl bg-muted/35"
                        />
                    ))}
                </div>
            </div>
        </main>
    );
}
