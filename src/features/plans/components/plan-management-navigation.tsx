"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import PlansNavigation from "./plans-navigation";

export default function PlanManagementNavigation() {
    const t = useTranslations("Plans");
    return (
        <div className="mb-5 space-y-2">
            <PlansNavigation />
            <Link
                href="/plans"
                className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary hover:underline"
            >
                <ArrowLeft
                    aria-hidden="true"
                    className="size-4 rtl:rotate-180"
                />
                {t("backToMyPlans")}
            </Link>
        </div>
    );
}
