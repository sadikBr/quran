"use client";

import { BookOpen } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

export default function AppLogo() {
    const t = useTranslations("Common");
    return (
        <Link
            href="/"
            aria-label={`${t("brand")} — ${t("navigation.home")}`}
            className="inline-flex min-h-11 shrink-0 items-center gap-2.5 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring rtl:flex-row-reverse"
        >
            <span className="flex size-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                <BookOpen className="size-5" aria-hidden="true" />
            </span>
            <span className="hidden text-sm font-semibold sm:inline">
                {t("brand")}
            </span>
        </Link>
    );
}
