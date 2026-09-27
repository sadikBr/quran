"use client";

import { LoaderCircle, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import AyahActions from "@/features/quran/components/ayah-actions";
import getAyahActionsData, {
    type AyahActionsData,
} from "@/features/quran/server/get-ayah-actions-data";
import type { SavedAyah } from "../types";

export default function SavedAyahActions({
    ayah,
    onCloseAction,
}: {
    ayah: SavedAyah;
    onCloseAction: () => void;
}) {
    const router = useRouter();
    const t = useTranslations("Dashboard");
    const commonT = useTranslations("Common");
    const locale = useLocale();
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const [data, setData] = useState<AyahActionsData | null>(null);
    const [loadFailed, setLoadFailed] = useState(false);

    const loadActions = useCallback(() => {
        let cancelled = false;

        setData(null);
        setLoadFailed(false);

        getAyahActionsData(ayah.surahNumber, ayah.ayahNumber)
            .then((result) => {
                if (cancelled) return;
                if (result) setData(result);
                else setLoadFailed(true);
            })
            .catch(() => {
                if (!cancelled) setLoadFailed(true);
            });

        return () => {
            cancelled = true;
        };
    }, [ayah.ayahNumber, ayah.surahNumber]);

    useEffect(() => {
        return loadActions();
    }, [loadActions]);

    useEffect(() => {
        closeButtonRef.current?.focus();

        function closeOnEscape(event: KeyboardEvent) {
            if (event.key === "Escape") onCloseAction();
        }

        window.addEventListener("keydown", closeOnEscape);
        return () => window.removeEventListener("keydown", closeOnEscape);
    }, [onCloseAction]);

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
            <button
                type="button"
                onClick={onCloseAction}
                className="absolute inset-0 bg-foreground/25 backdrop-blur-sm"
                aria-label={t("modal.close")}
            />
            <section
                lang={locale}
                dir={locale === "ar" ? "rtl" : "ltr"}
                role="dialog"
                aria-modal="true"
                aria-labelledby={data ? "ayah-actions-title" : undefined}
                aria-label={data ? undefined : t("modal.title")}
                className="relative z-10 flex max-h-[min(94dvh,52rem)] w-full max-w-2xl min-w-0 flex-col overflow-hidden rounded-t-[0.25rem] bg-background/98 shadow-[0_32px_90px_-24px_hsl(var(--foreground)/0.5)] ring-1 ring-border/60 backdrop-blur-xl sm:max-h-[calc(100dvh-2rem)] sm:rounded-[1.75rem]"
            >
                <button
                    ref={closeButtonRef}
                    type="button"
                    onClick={onCloseAction}
                    className="absolute top-3 end-3 z-20 inline-flex size-9 sm:top-4 sm:end-4 items-center justify-center rounded-full bg-muted/35 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={t("modal.close")}
                >
                    <X aria-hidden="true" className="size-4" />
                </button>

                <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-5 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-7 sm:pt-7 sm:pb-7">
                    {data ? (
                        <AyahActions
                            {...data}
                            onSavedAyahChangeAction={() => router.refresh()}
                        />
                    ) : loadFailed ? (
                        <div className="py-14 text-center">
                            <h2 className="font-semibold">
                                {t("modal.loadFailedTitle")}
                            </h2>
                            <p className="mt-2 text-sm text-muted-foreground">
                                {t("modal.loadFailedDescription")}
                            </p>
                            <Button
                                type="button"
                                variant="outline"
                                className="mt-5"
                                onClick={loadActions}
                            >
                                {commonT("error.retry")}
                            </Button>
                        </div>
                    ) : (
                        <div className="flex min-h-52 flex-col items-center justify-center gap-3 text-muted-foreground">
                            <LoaderCircle
                                aria-hidden="true"
                                className="size-5 animate-spin text-primary"
                            />
                            <p className="text-sm">{t("modal.loading")}</p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
