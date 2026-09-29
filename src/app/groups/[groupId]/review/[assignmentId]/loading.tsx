"use client";

import { useTranslations } from "next-intl";
import PageBackground from "@/components/page-background";

export default function AssignmentReviewLoading() {
    const t = useTranslations("Groups.review");
    return (
        <main aria-busy="true" className="relative min-h-dvh bg-background">
            <PageBackground />
            <p className="sr-only">{t("quranText")}</p>
            <div className="app-container motion-safe:animate-pulse">
                <div className="flex h-20 items-center justify-between">
                    <div className="h-9 w-40 rounded-lg bg-muted" />
                    <div className="size-10 rounded-full bg-muted" />
                </div>
                <div className="py-12">
                    <div className="h-3 w-28 rounded bg-primary/15" />
                    <div className="mt-4 h-10 w-2/3 rounded-xl bg-muted" />
                    <div className="mt-10 h-32 rounded-3xl bg-muted/45" />
                    <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
                        <div className="h-[32rem] rounded-3xl bg-muted/35" />
                        <div className="h-80 rounded-3xl bg-primary/[0.06]" />
                    </div>
                </div>
            </div>
        </main>
    );
}
