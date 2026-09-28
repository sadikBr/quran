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
            <header className="bg-background/92">
                <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-3 motion-safe:animate-pulse sm:px-5">
                    <div className="h-8 w-28 rounded-full bg-muted" />
                    <div className="h-5 w-28 rounded bg-muted" />
                </div>
            </header>

            <div className="mx-auto max-w-4xl px-3 motion-safe:animate-pulse sm:px-5">
                <section className="border-border/45 border-y py-2">
                    <div className="flex min-h-16 items-center justify-between gap-4">
                        <div className="flex flex-1 items-center gap-3">
                            <div className="h-6 w-10 rounded bg-primary/15" />
                            <div className="h-7 w-px bg-border/60" />
                            <div className="space-y-2">
                                <div className="h-2.5 w-24 rounded bg-primary/15" />
                                <div className="h-3 w-40 rounded bg-muted" />
                            </div>
                        </div>
                        <div className="h-9 w-36 rounded-full bg-muted" />
                    </div>
                </section>

                <div className="mt-10 flex items-center gap-4">
                    <span className="h-px flex-1 bg-primary/20" />
                    <div className="space-y-2">
                        <div className="mx-auto h-7 w-16 rounded bg-primary/15" />
                        <div className="h-4 w-24 rounded bg-muted" />
                    </div>
                    <span className="h-px flex-1 bg-primary/20" />
                </div>

                <div className="mt-6 space-y-4">
                    {AYAH_SKELETONS.map((item) => (
                        <article
                            key={item}
                            className="h-48 rounded-2xl bg-muted/35"
                        >
                            <span className="sr-only">{item}</span>
                        </article>
                    ))}
                </div>
            </div>
        </main>
    );
}
