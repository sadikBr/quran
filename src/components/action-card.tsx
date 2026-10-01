import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export default function ActionCard({
    href,
    title,
    description,
    icon,
    className,
}: {
    href: string;
    title: string;
    description?: string;
    icon: ReactNode;
    className?: string;
}) {
    return (
        <Link
            href={href}
            className={cn(
                "app-card group flex min-w-0 items-center gap-3.5 p-4 transition-colors hover:border-primary/30 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-5",
                className,
            )}
        >
            <span
                aria-hidden="true"
                className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary [&>svg]:size-5"
            >
                {icon}
            </span>
            <span className="min-w-0 flex-1">
                <span className="block break-words font-semibold">{title}</span>
                {description && (
                    <span className="mt-1 block break-words text-sm leading-6 text-muted-foreground">
                        {description}
                    </span>
                )}
            </span>
            <ArrowRight
                aria-hidden="true"
                className="size-4 shrink-0 text-primary transition-transform group-hover:ltr:translate-x-1 group-hover:rtl:-translate-x-1 rtl:rotate-180"
            />
        </Link>
    );
}
