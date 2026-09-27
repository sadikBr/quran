"use client";

import { useTranslations } from "next-intl";

export default function QuranReaderLoading() {
    const t = useTranslations("Reader");
    return (
        <div
            aria-busy="true"
            aria-live="polite"
            className="flex h-full min-h-0 flex-col"
        >
            <p className="sr-only">{t("loading")}</p>
            <div className="flex-1 overflow-hidden">
                <div className="mx-auto max-w-5xl space-y-6 p-3 motion-safe:animate-pulse sm:p-4">
                    <div className="flex min-h-20 items-center justify-center gap-5">
                        <div className="h-10 w-24 rounded-full bg-muted" />
                        <div className="h-14 w-14 rounded-2xl bg-muted" />
                        <div className="h-10 w-24 rounded-full bg-muted" />
                    </div>
                    <div className="flex justify-end">
                        <div className="h-12 w-52 rounded-2xl bg-muted" />
                    </div>
                    <div className="mx-auto h-10 w-40 rounded-xl bg-muted" />
                    <div className="space-y-5 py-2" dir="rtl">
                        <div className="ms-auto h-8 w-full rounded-lg bg-muted" />
                        <div className="ms-auto h-8 w-11/12 rounded-lg bg-muted" />
                        <div className="ms-auto h-8 w-full rounded-lg bg-muted" />
                        <div className="ms-auto h-8 w-4/5 rounded-lg bg-muted" />
                        <div className="ms-auto h-8 w-10/12 rounded-lg bg-muted" />
                        <div className="ms-auto h-8 w-full rounded-lg bg-muted" />
                    </div>
                </div>
            </div>
            <div className="shrink-0 border-t border-primary/15 bg-background/95">
                <div className="mx-auto flex h-18 max-w-5xl items-center justify-between px-4 sm:h-20">
                    <div className="h-9 w-10 rounded-md bg-muted min-[420px]:w-24" />
                    <div className="h-10 w-32 rounded-lg bg-muted" />
                    <div className="h-9 w-10 rounded-md bg-muted min-[420px]:w-20" />
                </div>
            </div>
        </div>
    );
}
