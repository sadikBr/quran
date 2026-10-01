"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Dialog } from "radix-ui";
import { type ReactNode, Suspense, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { ComboboxPortalContainerContext } from "@/components/ui/combobox";
import { cn } from "@/lib/utils";

import AyahActionsLoading from "./ayah-actions-loading";
import { AyahActionsToolbarContext } from "./ayah-actions-toolbar";

export default function AyahActionsModal({
    children,
    onCloseAction,
}: {
    children: ReactNode;
    onCloseAction?: () => void;
}) {
    const router = useRouter();
    const t = useTranslations("Reader");
    const locale = useLocale();
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const returnFocusRef = useRef<HTMLElement | null>(null);
    const [dialogElement, setDialogElement] = useState<HTMLDivElement | null>(
        null,
    );
    const [toolbarElement, setToolbarElement] = useState<HTMLDivElement | null>(
        null,
    );
    const close = onCloseAction ?? (() => router.back());

    return (
        <Dialog.Root
            open
            onOpenChange={(open) => {
                if (!open) close();
            }}
        >
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm" />
                <Dialog.Content
                    ref={setDialogElement}
                    lang={locale}
                    dir={locale === "ar" ? "rtl" : "ltr"}
                    aria-describedby={undefined}
                    onEscapeKeyDown={(event) => {
                        // Base UI handles Escape after Radix's capture listener.
                        // Let the open chooser close before dismissing its dialog.
                        if (
                            dialogElement?.querySelector(
                                '[role="combobox"][aria-expanded="true"]',
                            )
                        )
                            event.preventDefault();
                    }}
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
                    className={cn(
                        "fixed bottom-0 left-1/2 z-50 flex max-h-[min(92dvh,52rem)] w-full max-w-2xl -translate-x-1/2 flex-col overflow-hidden rounded-t-2xl border border-border/60 bg-background text-foreground shadow-2xl outline-none sm:bottom-auto sm:top-1/2 sm:max-h-[min(88dvh,52rem)] sm:w-[calc(100%-2rem)] sm:-translate-y-1/2 sm:rounded-2xl",
                        locale === "ar" && "arabic-ui",
                    )}
                >
                    <Dialog.Title className="sr-only">
                        {t("actions.title")}
                    </Dialog.Title>
                    <div className="flex shrink-0 items-center gap-3 border-b border-border/60 bg-background px-4 py-3 sm:px-6">
                        <div ref={setToolbarElement} className="min-w-0 flex-1">
                            <span className="hidden py-3 text-sm font-semibold only:block">
                                {t("actions.title")}
                            </span>
                        </div>
                        <Button
                            ref={closeButtonRef}
                            type="button"
                            variant="ghost"
                            size="icon-lg"
                            onClick={close}
                            className="text-muted-foreground"
                            aria-label={t("actions.close")}
                        >
                            <X aria-hidden="true" />
                        </Button>
                    </div>
                    <div
                        data-ayah-actions-scroll
                        className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))] [scrollbar-gutter:stable] sm:px-6 sm:pb-6"
                    >
                        <ComboboxPortalContainerContext value={dialogElement}>
                            <AyahActionsToolbarContext value={toolbarElement}>
                                <div className="min-w-0 pt-5 sm:pt-6">
                                    <Suspense fallback={<AyahActionsLoading />}>
                                        {children}
                                    </Suspense>
                                </div>
                            </AyahActionsToolbarContext>
                        </ComboboxPortalContainerContext>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
