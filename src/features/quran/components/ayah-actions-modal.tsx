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
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
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
                className="relative z-10 max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto rounded-[1.75rem] bg-background/98 p-5 shadow-[0_32px_90px_-24px_hsl(var(--foreground)/0.5)] ring-1 ring-border/60 backdrop-blur-xl sm:p-8"
            >
                <button
                    ref={closeButtonRef}
                    type="button"
                    onClick={() => router.back()}
                    className="absolute top-4 end-4 inline-flex size-8 items-center justify-center rounded-full bg-muted/35 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={t("actions.close")}
                >
                    <X aria-hidden="true" className="size-4" />
                </button>
                {children}
            </section>
        </div>
    );
}
