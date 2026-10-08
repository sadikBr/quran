"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

export default function TodayReturnLink() {
    const t = useTranslations("Plans");
    return (
        <Link
            href="/plans/today"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
            <ArrowLeft
                aria-hidden="true"
                className="size-4 shrink-0 rtl:rotate-180"
            />
            {t("backToToday")}
        </Link>
    );
}
