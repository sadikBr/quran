import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** The shared heading for a page section or card, in both reading directions. */
export default function SectionHeading({
    title,
    description,
    icon,
    actions,
    id,
    className,
}: {
    title: string;
    description?: string;
    icon?: ReactNode;
    actions?: ReactNode;
    id?: string;
    className?: string;
}) {
    return (
        <div
            className={cn(
                "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
                className,
            )}
        >
            <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                {icon && (
                    <span
                        aria-hidden="true"
                        className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary [&>svg]:size-5"
                    >
                        {icon}
                    </span>
                )}
                <div className="min-w-0">
                    <h2 id={id} className="break-words font-semibold leading-6">
                        {title}
                    </h2>
                    {description && (
                        <p className="mt-1 max-w-2xl break-words text-sm leading-6 text-muted-foreground">
                            {description}
                        </p>
                    )}
                </div>
            </div>
            {actions && (
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {actions}
                </div>
            )}
        </div>
    );
}
