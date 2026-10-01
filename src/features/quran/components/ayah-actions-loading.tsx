"use client";

import { LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";

export default function AyahActionsLoading() {
    const t = useTranslations("Common");
    return (
        <output className="flex min-h-72 items-center justify-center gap-3 text-sm text-muted-foreground">
            <LoaderCircle aria-hidden="true" className="size-5 animate-spin" />
            {t("loading.label")}
        </output>
    );
}
