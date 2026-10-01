"use client";

import { ArrowLeft, BookOpen, RefreshCw, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useEffect } from "react";
import PageBackground from "@/components/page-background";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function RouteError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const locale = useLocale();
    const t = useTranslations("Common.error");
    const isArabic = locale === "ar";

    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <main
            lang={locale}
            dir={isArabic ? "rtl" : "ltr"}
            className={cn(
                "relative isolate grid min-h-dvh place-items-center overflow-hidden bg-background p-4 sm:p-6",
                isArabic && "arabic-ui",
            )}
        >
            <PageBackground />
            <section className="relative w-full max-w-lg overflow-hidden app-card p-5 text-center sm:p-8">
                <div
                    aria-hidden="true"
                    className="absolute -top-24 -end-20 size-52 rounded-full bg-primary/10 blur-3xl"
                />
                <span className="relative mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
                    <TriangleAlert className="size-6" />
                </span>
                <p className="relative mt-5 text-xs font-bold tracking-[0.16em] text-primary uppercase">
                    {t("eyebrow")}
                </p>
                <h1 className="relative mt-2 text-2xl font-semibold sm:text-3xl">
                    {t("title")}
                </h1>
                <p className="relative mx-auto mt-3 max-w-md text-sm leading-7 text-muted-foreground">
                    {t("description")}
                </p>
                <div className="relative mt-7 grid gap-2 min-[420px]:grid-cols-3">
                    <Button onClick={reset} className="min-h-11 rounded-xl">
                        <RefreshCw aria-hidden="true" className="size-4" />
                        {t("retry")}
                    </Button>
                    <Button
                        asChild
                        variant="outline"
                        className="min-h-11 rounded-xl"
                    >
                        <Link href="/dashboard">
                            <ArrowLeft
                                aria-hidden="true"
                                className={cn(
                                    "size-4",
                                    isArabic && "rotate-180",
                                )}
                            />
                            {t("dashboard")}
                        </Link>
                    </Button>
                    <Button
                        asChild
                        variant="ghost"
                        className="min-h-11 rounded-xl"
                    >
                        <Link href="/quran">
                            <BookOpen aria-hidden="true" className="size-4" />
                            {t("quran")}
                        </Link>
                    </Button>
                </div>
            </section>
        </main>
    );
}
