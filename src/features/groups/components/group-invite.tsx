"use client";

import { Check, Copy, Link as LinkIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export default function GroupInvite({ inviteCode }: { inviteCode: string }) {
    const t = useTranslations("Groups.detail");
    const [copied, setCopied] = useState<"code" | "link" | null>(null);

    const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(
        () => () => {
            if (resetTimer.current) clearTimeout(resetTimer.current);
        },
        [],
    );

    async function copy(value: string, type: "code" | "link") {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(type);
            toast.success(t("copied"));
            if (resetTimer.current) clearTimeout(resetTimer.current);
            resetTimer.current = setTimeout(() => setCopied(null), 1800);
        } catch {
            setCopied(null);
            toast.error(t("copyError"));
        }
    }

    const CopyIcon = copied === "code" ? Check : Copy;
    const LinkCopyIcon = copied === "link" ? Check : LinkIcon;

    return (
        <div className="mt-4 flex min-w-0 flex-col gap-3">
            <div className="flex min-h-12 flex-1 items-center justify-between gap-4 rounded-xl bg-background/65 px-4 ring-1 ring-border/60">
                <span className="text-xs text-muted-foreground">
                    {t("inviteCode")}
                </span>
                <strong
                    dir="ltr"
                    className="select-all break-all font-mono text-sm tracking-[0.12em] text-primary"
                >
                    {inviteCode}
                </strong>
            </div>
            <div className="grid grid-cols-2 gap-2">
                <Button
                    type="button"
                    variant="outline"
                    className="h-auto min-h-11 rounded-xl px-2 py-2 text-xs whitespace-normal"
                    onClick={() => copy(inviteCode, "code")}
                >
                    <CopyIcon aria-hidden="true" className="size-4" />
                    {t("copyCode")}
                </Button>
                <Button
                    type="button"
                    className="h-auto min-h-11 rounded-xl px-2 py-2 text-xs whitespace-normal"
                    onClick={() =>
                        copy(
                            `${window.location.origin}/groups?join=${inviteCode}`,
                            "link",
                        )
                    }
                >
                    <LinkCopyIcon aria-hidden="true" className="size-4" />
                    {t("copyLink")}
                </Button>
            </div>
        </div>
    );
}
