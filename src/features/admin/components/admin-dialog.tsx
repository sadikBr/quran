"use client";

import { X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Dialog } from "radix-ui";
import { type ReactNode, useRef } from "react";
import { Button } from "@/components/ui/button";

export default function AdminDialog({
    open,
    onClose,
    pending,
    title,
    description,
    children,
    footer,
}: {
    open: boolean;
    onClose: () => void;
    pending: boolean;
    title: string;
    description: string;
    children: ReactNode;
    footer: ReactNode;
}) {
    const locale = useLocale();
    const t = useTranslations("Admin");
    const trigger = useRef<HTMLElement | null>(null);
    return (
        <Dialog.Root
            open={open}
            onOpenChange={(value) => {
                if (!value && !pending) onClose();
            }}
        >
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm" />
                <Dialog.Content
                    dir={locale === "ar" ? "rtl" : "ltr"}
                    lang={locale}
                    onOpenAutoFocus={() => {
                        trigger.current =
                            document.activeElement instanceof HTMLElement
                                ? document.activeElement
                                : null;
                    }}
                    onCloseAutoFocus={(event) => {
                        if (trigger.current?.isConnected) {
                            event.preventDefault();
                            trigger.current.focus();
                        }
                    }}
                    onEscapeKeyDown={(event) => {
                        if (pending) event.preventDefault();
                    }}
                    onPointerDownOutside={(event) => {
                        if (pending) event.preventDefault();
                    }}
                    className={`fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-border/60 bg-background text-foreground shadow-2xl outline-none ${locale === "ar" ? "arabic-ui" : ""}`}
                >
                    <div className="flex shrink-0 items-start gap-3 border-b border-border/60 p-4 sm:p-5">
                        <div className="min-w-0 flex-1">
                            <Dialog.Title className="break-words text-lg font-semibold">
                                {title}
                            </Dialog.Title>
                            <Dialog.Description className="mt-2 text-sm leading-6 text-muted-foreground">
                                {description}
                            </Dialog.Description>
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={t("close")}
                            disabled={pending}
                            onClick={onClose}
                            className="-me-1 -mt-1 text-muted-foreground"
                        >
                            <X aria-hidden="true" />
                        </Button>
                    </div>
                    <div className="min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5">
                        {children}
                    </div>
                    <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-border/60 bg-muted/20 p-4 sm:flex-row sm:justify-end sm:p-5 [&>button]:min-h-11 [&>button]:whitespace-normal">
                        {footer}
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
