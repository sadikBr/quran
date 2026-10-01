import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export default function PageHeading({
    title,
    description,
    icon,
    actions,
    children,
    className,
}: {
    title: string;
    description?: string;
    icon?: ReactNode;
    actions?: ReactNode;
    children?: ReactNode;
    className?: string;
}) {
    return (
        <header className={cn("border-b border-border/60 pb-6", className)}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3.5 sm:gap-4">
                    {icon && (
                        <span
                            aria-hidden="true"
                            className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/10 sm:size-12 [&>svg]:size-5"
                        >
                            {icon}
                        </span>
                    )}
                    <div className="min-w-0">
                        <h1 className="break-words text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
                            {title}
                        </h1>
                        {description && (
                            <p className="mt-2 max-w-2xl break-words text-sm leading-6 text-muted-foreground">
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
            {children}
        </header>
    );
}
