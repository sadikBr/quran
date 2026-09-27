"use client";

import { useTranslations } from "next-intl";

export default function QuranLoading() {
    const t = useTranslations("Reader");
    return (
        <div
            aria-busy="true"
            aria-live="polite"
            className="mx-auto h-full max-w-5xl overflow-hidden p-4"
        >
            <p className="sr-only">{t("loading")}</p>
            <div className="space-y-8 pt-4 motion-safe:animate-pulse">
                <div className="mx-auto h-10 w-48 rounded-md bg-muted" />
                <div className="space-y-4 bg-card/35 p-4 sm:p-6">
                    <div className="ml-auto h-7 w-40 rounded bg-muted" />
                    <div className="space-y-3" dir="rtl">
                        <div className="h-8 w-full rounded bg-muted" />
                        <div className="h-8 w-11/12 rounded bg-muted" />
                        <div className="h-8 w-4/5 rounded bg-muted" />
                        <div className="h-8 w-10/12 rounded bg-muted" />
                    </div>
                </div>
                <div className="space-y-3 bg-card/35 p-4 sm:p-6">
                    <div className="ml-auto h-7 w-36 rounded bg-muted" />
                    <div className="space-y-3" dir="rtl">
                        <div className="h-8 w-10/12 rounded bg-muted" />
                        <div className="h-8 w-full rounded bg-muted" />
                        <div className="h-8 w-3/4 rounded bg-muted" />
                    </div>
                </div>
            </div>
        </div>
    );
}
