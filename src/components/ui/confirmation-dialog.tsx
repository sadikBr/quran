"use client";

import { AlertTriangle, LoaderCircle, ShieldCheck } from "lucide-react";
import { useLocale } from "next-intl";
import { AlertDialog } from "radix-ui";
import { type ReactNode, useRef } from "react";
import { Button } from "./button";

export default function ConfirmationDialog({
    open,
    onOpenChange,
    title,
    description,
    children,
    confirmLabel,
    cancelLabel,
    pending,
    destructive = false,
    onConfirm,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    children?: ReactNode;
    confirmLabel: string;
    cancelLabel: string;
    pending: boolean;
    destructive?: boolean;
    onConfirm: () => void;
}) {
    const locale = useLocale();
    const returnFocus = useRef<HTMLElement | null>(null);
    const Icon = destructive ? AlertTriangle : ShieldCheck;
    return (
        <AlertDialog.Root
            open={open}
            onOpenChange={(value) => {
                if (!pending) onOpenChange(value);
            }}
        >
            <AlertDialog.Portal>
                <AlertDialog.Overlay className="fixed inset-0 z-[60] bg-black/55 backdrop-blur-sm" />
                <AlertDialog.Content
                    dir={locale === "ar" ? "rtl" : "ltr"}
                    lang={locale}
                    onOpenAutoFocus={() => {
                        returnFocus.current =
                            document.activeElement instanceof HTMLElement
                                ? document.activeElement
                                : null;
                    }}
                    onCloseAutoFocus={(event) => {
                        if (returnFocus.current?.isConnected) {
                            event.preventDefault();
                            returnFocus.current.focus();
                        }
                    }}
                    onEscapeKeyDown={(event) => {
                        if (pending) event.preventDefault();
                    }}
                    className={`fixed left-1/2 top-1/2 z-[61] max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border bg-background p-5 text-foreground shadow-2xl outline-none sm:p-7 ${locale === "ar" ? "arabic-ui" : ""}`}
                >
                    <span
                        className={`mb-4 flex size-11 items-center justify-center rounded-xl ${destructive ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}
                    >
                        <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <AlertDialog.Title className="text-xl font-semibold">
                        {title}
                    </AlertDialog.Title>
                    <AlertDialog.Description className="mt-3 whitespace-pre-line text-sm leading-7 text-muted-foreground">
                        {description}
                    </AlertDialog.Description>
                    {children}
                    <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <AlertDialog.Cancel asChild>
                            <Button variant="outline" disabled={pending}>
                                {cancelLabel}
                            </Button>
                        </AlertDialog.Cancel>
                        <Button
                            variant={destructive ? "destructive" : "default"}
                            disabled={pending}
                            aria-busy={pending}
                            onClick={onConfirm}
                            className="h-auto min-h-10 whitespace-normal py-2"
                        >
                            {pending && (
                                <LoaderCircle
                                    className="size-4 animate-spin"
                                    aria-hidden="true"
                                />
                            )}
                            {confirmLabel}
                        </Button>
                    </div>
                </AlertDialog.Content>
            </AlertDialog.Portal>
        </AlertDialog.Root>
    );
}
