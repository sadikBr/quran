"use client";
import {
    BarChart3,
    CalendarDays,
    NotebookPen,
    Repeat2,
    Sparkles,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export default function ToolNavigation({ cards = false }: { cards?: boolean }) {
    const t = useTranslations("Memorization.retention");
    const plansT = useTranslations("Plans");
    const path = usePathname();
    const tools = [
        { href: "/memorization", key: "map", icon: Sparkles },
        {
            href: "/plans",
            key: "followUps",
            icon: CalendarDays,
        },
        { href: "/memorization/mistakes", key: "notebook", icon: NotebookPen },
        { href: "/memorization/similar", key: "similar", icon: Repeat2 },
        { href: "/memorization/report", key: "report", icon: BarChart3 },
    ] as const;
    return (
        <nav
            aria-label={t("tools")}
            className={
                cards
                    ? "my-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
                    : "my-6 flex gap-2 overflow-x-auto pb-2 sm:flex-wrap"
            }
        >
            {tools
                .filter((item) => !cards || item.key !== "map")
                .map(({ href, key, icon: Icon }) => (
                    <Link
                        key={key}
                        href={href}
                        aria-current={path === href ? "page" : undefined}
                        className={cn(
                            "min-w-0 rounded-2xl border transition-colors hover:border-primary/40 hover:bg-primary/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            cards
                                ? "app-card p-4 sm:p-5"
                                : "inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap px-3 py-2 text-sm",
                            path === href &&
                                "border-primary/30 bg-primary/10 text-primary",
                        )}
                    >
                        <span className="flex items-center gap-2 font-semibold">
                            <Icon
                                className="size-4 shrink-0 text-primary"
                                aria-hidden="true"
                            />
                            {key === "followUps" ? plansT("myPlans") : t(key)}
                        </span>
                        {cards && (
                            <p className="mt-2 text-xs leading-6 text-muted-foreground">
                                {key === "followUps"
                                    ? plansT("manageHint")
                                    : t(`${key}Hint`)}
                            </p>
                        )}
                    </Link>
                ))}
        </nav>
    );
}
