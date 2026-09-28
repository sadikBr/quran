"use client";

import { Check, Copy, Link as LinkIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export default function GroupInvite({ inviteCode }: { inviteCode: string }) {
    const t = useTranslations("Groups.detail");
    const [copied, setCopied] = useState<"code" | "link" | null>(null);

    async function copy(value: string, type: "code" | "link") {
        await navigator.clipboard.writeText(value);
        setCopied(type);
        toast.success(t("copied"));
        window.setTimeout(() => setCopied(null), 1800);
    }

    const CopyIcon = copied === "code" ? Check : Copy;
    const LinkCopyIcon = copied === "link" ? Check : LinkIcon;

    return (
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex min-h-12 flex-1 items-center justify-between gap-4 rounded-xl bg-background/65 px-4 ring-1 ring-border/60">
                <span className="text-xs text-muted-foreground">
                    {t("inviteCode")}
                </span>
                <strong className="font-mono text-sm tracking-[0.16em] text-primary">
                    {inviteCode}
                </strong>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex">
                <Button
                    type="button"
                    variant="outline"
                    className="h-12 rounded-xl"
                    onClick={() => copy(inviteCode, "code")}
                >
                    <CopyIcon aria-hidden="true" className="size-4" />
                    {t("copyCode")}
                </Button>
                <Button
                    type="button"
                    className="h-12 rounded-xl"
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
