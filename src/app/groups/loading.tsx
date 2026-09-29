"use client";

import { useTranslations } from "next-intl";
import PageBackground from "@/components/page-background";

export default function GroupsLoading() {
    const t = useTranslations("Groups");
    return (
        <main aria-busy="true" className="relative min-h-dvh bg-background">
            <PageBackground />
            <p className="sr-only">{t("loading")}</p>
            <div className="app-container motion-safe:animate-pulse">
                <div className="flex h-20 items-center justify-between">
                    <div className="h-9 w-40 rounded-lg bg-muted" />
                    <div className="size-10 rounded-full bg-muted" />
                </div>
                <div className="py-8 sm:py-14">
                    <div className="h-3 w-32 rounded bg-primary/15" />
                    <div className="mt-4 h-10 w-2/3 rounded-xl bg-muted" />
                    <div className="mt-8 overflow-hidden rounded-3xl border border-border/60 bg-card/40 px-4 sm:mt-10 sm:px-5">
                        <div className="flex items-center gap-4 py-5 sm:py-6">
                            <div className="size-10 rounded-xl bg-muted" />
                            <div className="space-y-2">
                                <div className="h-5 w-44 rounded bg-muted" />
                                <div className="h-3 w-64 rounded bg-muted/70" />
                            </div>
                        </div>
                    </div>
                    <div className="mt-10 rounded-3xl border border-border/60 bg-card/40 p-4 sm:mt-12 sm:p-6">
                        <div className="h-10 w-72 max-w-full rounded-xl bg-muted" />
                        <div className="mt-8 grid gap-10 lg:grid-cols-[18rem_minmax(0,1fr)]">
                            <div className="h-24 rounded-xl bg-muted/50" />
                            <div className="h-64 rounded-xl bg-muted/35" />
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
