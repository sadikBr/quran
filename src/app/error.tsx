"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const locale = useLocale();
    const t = useTranslations("Common");

    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <main
            lang={locale}
            dir={locale === "ar" ? "rtl" : "ltr"}
            className="flex min-h-screen items-center justify-center p-6"
        >
            <section className="flex max-w-md flex-col items-center gap-5 text-center">
                <p className="text-sm font-semibold tracking-[0.2em] text-primary">
                    {t("error.eyebrow")}
                </p>
                <div className="space-y-2">
                    <h1 className="text-3xl font-semibold">
                        {t("error.title")}
                    </h1>
                    <p className="text-muted-foreground">
                        {t("error.description")}
                    </p>
                </div>
                <Button onClick={reset}>{t("error.retry")}</Button>
            </section>
        </main>
    );
}
