"use client";

import { useTranslations } from "next-intl";
import PageBackground from "@/components/page-background";

export default function GroupsLoading() {
    const t = useTranslations("Groups");
    return (
        <main aria-busy="true" className="relative min-h-dvh bg-background">
            <PageBackground />
            <p className="sr-only">{t("loading")}</p>
            <div className="mx-auto max-w-5xl px-4 motion-safe:animate-pulse">
                <div className="flex h-20 items-center justify-between">
                    <div className="h-9 w-40 rounded-lg bg-muted" />
                    <div className="size-10 rounded-full bg-muted" />
                </div>
                <div className="py-12">
                    <div className="h-3 w-32 rounded bg-primary/15" />
                    <div className="mt-4 h-10 w-2/3 rounded-xl bg-muted" />
                    <div className="mt-10 border-border/60 border-y">
                        <div className="flex items-center gap-4 py-6">
                            <div className="size-10 rounded-full bg-muted" />
                            <div className="space-y-2">
                                <div className="h-5 w-44 rounded bg-muted" />
                                <div className="h-3 w-64 rounded bg-muted/70" />
                            </div>
                        </div>
                    </div>
                    <div className="mt-16 border-primary/10 border-t pt-7">
                        <div className="h-10 w-72 rounded-full bg-muted" />
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
