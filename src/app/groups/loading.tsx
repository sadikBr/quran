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
                    <div className="mt-10 grid gap-4 sm:grid-cols-2">
                        <div className="h-56 rounded-3xl bg-muted/60" />
                        <div className="h-56 rounded-3xl bg-muted/60" />
                    </div>
                    <div className="mt-10 h-80 rounded-3xl bg-muted/40" />
                </div>
            </div>
        </main>
    );
}
