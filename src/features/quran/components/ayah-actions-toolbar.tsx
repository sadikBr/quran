"use client";

import { ArrowLeft, BookOpenText } from "lucide-react";
import { useTranslations } from "next-intl";
import { createContext, useContext } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";

export const AyahActionsToolbarContext = createContext<
    HTMLElement | null | undefined
>(undefined);

/** Keep navigation outside the scrolling content when presented in a dialog. */
export default function AyahActionsToolbar({
    title,
    onBack,
}: {
    title: string;
    onBack?: () => void;
}) {
    const container = useContext(AyahActionsToolbarContext);
    const t = useTranslations("Reader.actions");
    // The dialog renders a fallback title until its toolbar host is mounted.
    if (container === null) return null;
    const toolbar = (
        <div className="flex min-w-0 items-center gap-3">
            {onBack ? (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-lg"
                    onClick={onBack}
                    aria-label={t("back")}
                    title={t("back")}
                >
                    <ArrowLeft aria-hidden="true" className="rtl:rotate-180" />
                </Button>
            ) : (
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <BookOpenText aria-hidden="true" className="size-5" />
                </span>
            )}
            <span className="min-w-0 break-words text-sm font-semibold text-foreground sm:text-base">
                {title}
            </span>
        </div>
    );
    return container ? (
        createPortal(toolbar, container)
    ) : (
        <div className="mb-5">{toolbar}</div>
    );
}
