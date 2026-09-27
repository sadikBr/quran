"use client";

import { useTranslations } from "next-intl";

const AYAH_SKELETONS = ["first", "second", "third"] as const;

export default function WirdReaderLoading() {
    const t = useTranslations("Wird.loading");

    return (
        <main
            aria-busy="true"
            aria-live="polite"
            className="h-dvh overflow-hidden bg-background"
        >
            <p className="sr-only">{t("reader")}</p>
            <header className="border-border/60 border-b bg-background/90">
                <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 motion-safe:animate-pulse">
                    <div className="h-4 w-24 rounded bg-muted" />
                    <div className="h-5 w-32 rounded bg-muted" />
                </div>
            </header>

            <div className="mx-auto max-w-4xl px-3 motion-safe:animate-pulse sm:px-4">
                <section className="py-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="space-y-2">
                            <div className="h-3 w-28 rounded bg-primary/15" />
                            <div className="h-4 w-44 rounded bg-muted" />
                        </div>
                        <div className="h-10 w-40 rounded-full bg-muted" />
                    </div>
                    <div className="mt-3 h-1 rounded-full bg-muted" />
                </section>

                <div className="mt-5 flex items-center gap-4">
                    <span className="h-px flex-1 bg-border/70" />
                    <div className="space-y-2">
                        <div className="mx-auto h-7 w-16 rounded bg-primary/15" />
                        <div className="h-4 w-24 rounded bg-muted" />
                    </div>
                    <span className="h-px flex-1 bg-border/70" />
                </div>

                <div className="mt-5 space-y-4">
                    {AYAH_SKELETONS.map((item, index) => (
                        <article
                            key={item}
                            className="rounded-2xl bg-muted/25 px-4 py-5 sm:px-6"
                        >
                            <div className="space-y-4" dir="rtl">
                                <div className="ms-auto h-7 w-full rounded bg-muted" />
                                <div
                                    className={`ms-auto h-7 rounded bg-muted ${
                                        index === 1 ? "w-4/5" : "w-11/12"
                                    }`}
                                />
                            </div>
                            <div className="mt-5 ms-auto h-8 w-28 rounded-full bg-muted" />
                        </article>
                    ))}
                </div>
            </div>
        </main>
    );
}
