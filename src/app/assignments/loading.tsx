"use client";

import { useTranslations } from "next-intl";
import PageBackground from "@/components/page-background";

export default function AssignmentsLoading() {
    const t = useTranslations("Assignments");
    return (
        <main aria-busy="true" className="relative min-h-dvh bg-background">
            <PageBackground />
            <p className="sr-only">{t("loading")}</p>
            <div className="mx-auto max-w-5xl px-4 motion-safe:animate-pulse">
                <div className="flex h-20 items-center justify-between">
                    <div className="h-9 w-36 rounded-lg bg-muted" />
                    <div className="size-10 rounded-full bg-muted" />
                </div>
                <div className="py-12">
                    <div className="h-3 w-32 rounded bg-primary/15" />
                    <div className="mt-4 h-10 w-2/3 rounded-xl bg-muted" />
                    <div className="mt-4 h-5 w-full max-w-xl rounded bg-muted/70" />
                    <div className="mt-12 grid gap-4 lg:grid-cols-2">
                        <div className="h-72 rounded-3xl bg-muted/50" />
                        <div className="h-72 rounded-3xl bg-muted/50" />
                    </div>
                </div>
            </div>
        </main>
    );
}
