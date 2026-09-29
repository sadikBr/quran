"use client";

import { useTranslations } from "next-intl";
import PageBackground from "@/components/page-background";

export default function MeetingPlanLoading() {
    const t = useTranslations("Groups.planner");

    return (
        <main aria-busy="true" className="relative min-h-dvh bg-background">
            <PageBackground />
            <p className="sr-only">{t("loading")}</p>
            <div className="app-container motion-safe:animate-pulse">
                <div className="flex h-20 items-center justify-between">
                    <div className="h-9 w-40 rounded-lg bg-muted" />
                    <div className="size-10 rounded-full bg-muted" />
                </div>
                <div className="py-12">
                    <div className="h-3 w-28 rounded bg-primary/15" />
                    <div className="mt-4 h-10 w-2/3 rounded-xl bg-muted" />
                    <div className="mt-8 h-32 rounded-3xl bg-primary/[0.06]" />
                    <div className="mt-6 overflow-hidden rounded-3xl ring-1 ring-border/50">
                        {[
                            "first",
                            "second",
                            "third",
                            "fourth",
                            "fifth",
                            "sixth",
                        ].map((item) => (
                            <div
                                key={item}
                                className="h-20 border-b border-border/40 bg-muted/35 last:border-0"
                            />
                        ))}
                    </div>
                </div>
            </div>
        </main>
    );
}
