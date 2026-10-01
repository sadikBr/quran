"use client";

import { ArrowLeft, RefreshCw, WifiOff } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function QuranReaderError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const t = useTranslations("Reader.readerError");
    const locale = useLocale();

    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="grid h-full min-h-0 place-items-center overflow-y-auto p-5">
            <section className="w-full max-w-lg app-card p-5 text-center sm:p-8">
                <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
                    <WifiOff aria-hidden="true" className="size-6" />
                </span>
                <p className="mt-5 text-xs font-bold tracking-[0.16em] text-primary uppercase">
                    {t("eyebrow")}
                </p>
                <h1 className="mt-2 text-2xl font-semibold text-foreground sm:text-3xl">
                    {t("title")}
                </h1>
                <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-muted-foreground">
                    {t("description")}
                </p>
                <div className="mt-7 flex flex-col justify-center gap-3 min-[390px]:flex-row">
                    <Button onClick={reset} className="min-h-11">
                        <RefreshCw aria-hidden="true" className="size-4" />
                        {t("retry")}
                    </Button>
                    <Button asChild variant="outline" className="min-h-11">
                        <Link href="/quran">
                            <ArrowLeft
                                aria-hidden="true"
                                className={cn(
                                    "size-4",
                                    locale === "ar" && "rotate-180",
                                )}
                            />
                            {t("index")}
                        </Link>
                    </Button>
                </div>
            </section>
        </div>
    );
}
