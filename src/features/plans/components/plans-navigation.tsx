"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { plansView } from "../navigation";

export default function PlansNavigation() {
    const t = useTranslations("Plans");
    const activeView = plansView(usePathname());
    return (
        <nav
            aria-label={t("navigation")}
            className="flex gap-1 overflow-x-auto rounded-xl border bg-card p-1"
        >
            {[
                ["/plans/today", "today"],
                ["/weekly", "week"],
                ["/plans", "myPlans"],
            ].map(([href, label]) => (
                <Link
                    key={href}
                    href={href}
                    aria-current={activeView === label ? "page" : undefined}
                    className={cn(
                        "flex min-h-11 flex-1 items-center justify-center whitespace-nowrap rounded-lg px-4 text-sm font-semibold transition-colors hover:bg-muted",
                        activeView === label && "bg-primary/10 text-primary",
                    )}
                >
                    {t(label)}
                </Link>
            ))}
        </nav>
    );
}
