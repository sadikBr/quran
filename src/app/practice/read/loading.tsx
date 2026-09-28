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
            <div className="h-16 border-border/60 border-b bg-background" />
            <div className="mx-auto max-w-4xl px-4 py-5 motion-safe:animate-pulse">
                <div className="h-20 rounded-2xl bg-muted/45" />
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
