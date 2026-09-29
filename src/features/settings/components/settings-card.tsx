import type { ReactNode } from "react";

export default function PreferenceCard({
    title,
    description,
    children,
}: {
    title: string;
    description: string;
    children: ReactNode;
}) {
    return (
        <section className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(14rem,19rem)] sm:items-center sm:gap-6">
            <div className="max-w-md">
                <h3 className="text-sm font-semibold tracking-tight text-foreground">
                    {title}
                </h3>
                <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                    {description}
                </p>
            </div>
            <div className="min-w-0">{children}</div>
        </section>
    );
}
