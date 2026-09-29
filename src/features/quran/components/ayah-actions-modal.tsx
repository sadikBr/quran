"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Dialog } from "radix-ui";
import { type ReactNode, useRef } from "react";

export default function AyahActionsModal({
    children,
}: {
    children: ReactNode;
}) {
    const router = useRouter();
    const t = useTranslations("Reader");
    const locale = useLocale();
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const returnFocusRef = useRef<HTMLElement | null>(null);

    return (
        <Dialog.Root
            open
            onOpenChange={(open) => {
                if (!open) router.back();
            }}
        >
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
                <Dialog.Content
                    lang={locale}
                    dir={locale === "ar" ? "rtl" : "ltr"}
                    aria-describedby={undefined}
                    onOpenAutoFocus={(event) => {
                        event.preventDefault();
                        returnFocusRef.current =
                            document.activeElement instanceof HTMLElement
                                ? document.activeElement
                                : null;
                        closeButtonRef.current?.focus();
                    }}
                    onCloseAutoFocus={(event) => {
                        if (returnFocusRef.current?.isConnected) {
                            event.preventDefault();
                            returnFocusRef.current.focus();
                        }
                    }}
                    className="fixed bottom-0 left-1/2 z-50 flex max-h-[94dvh] w-full max-w-2xl -translate-x-1/2 flex-col overflow-hidden rounded-t-2xl border border-border/60 bg-background shadow-2xl sm:bottom-auto sm:top-1/2 sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100%-2rem)] sm:-translate-y-1/2 sm:rounded-2xl"
                >
                    <Dialog.Title className="sr-only">
                        {t("actions.title")}
                    </Dialog.Title>
                    <button
                        ref={closeButtonRef}
                        type="button"
                        onClick={() => router.back()}
                        className="absolute top-3 end-3 z-20 inline-flex size-11 items-center justify-center rounded-xl bg-muted/65 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:top-4 sm:end-4"
                        aria-label={t("actions.close")}
                    >
                        <X aria-hidden="true" className="size-4" />
                    </button>
                    <div
                        data-ayah-actions-scroll
                        className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-5 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-7 sm:pt-7 sm:pb-7"
                    >
                        {children}
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
