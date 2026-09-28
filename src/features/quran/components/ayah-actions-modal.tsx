"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { type ReactNode, useEffect, useRef } from "react";

export default function AyahActionsModal({
    children,
}: {
    children: ReactNode;
}) {
    const router = useRouter();
    const t = useTranslations("Reader");
    const locale = useLocale();
    const closeButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        closeButtonRef.current?.focus();

        function closeOnEscape(event: KeyboardEvent) {
            if (event.key === "Escape") {
                router.back();
            }
        }

        window.addEventListener("keydown", closeOnEscape);
        return () => window.removeEventListener("keydown", closeOnEscape);
    }, [router]);

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
            <button
                type="button"
                onClick={() => router.back()}
                className="absolute inset-0 bg-foreground/25 backdrop-blur-sm"
                aria-label={t("actions.close")}
            />
            <section
                lang={locale}
                dir={locale === "ar" ? "rtl" : "ltr"}
                role="dialog"
                aria-modal="true"
                aria-labelledby="ayah-actions-title"
                className="relative z-10 flex max-h-[min(94dvh,52rem)] w-full max-w-2xl min-w-0 flex-col overflow-hidden rounded-t-[1.5rem] bg-background/98 shadow-[0_32px_90px_-24px_hsl(var(--foreground)/0.5)] ring-1 ring-border/60 backdrop-blur-xl sm:max-h-[calc(100dvh-2rem)] sm:rounded-[1.75rem]"
            >
                <button
                    ref={closeButtonRef}
                    type="button"
                    onClick={() => router.back()}
                    className="absolute top-3 end-3 z-20 inline-flex size-10 items-center justify-center rounded-full bg-muted/65 text-muted-foreground ring-1 ring-border/40 transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:top-4 sm:end-4"
                    aria-label={t("actions.close")}
                >
                    <X aria-hidden="true" className="size-4" />
                </button>
                <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-5 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-7 sm:pt-7 sm:pb-7">
                    {children}
                </div>
            </section>
        </div>
    );
}
