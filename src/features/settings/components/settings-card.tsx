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
        <section className="group grid gap-4 py-2 sm:grid-cols-[minmax(0,1fr)_minmax(14rem,19rem)] sm:items-center sm:gap-10">
            <div className="max-w-md">
                <h2 className="text-base font-medium tracking-tight text-foreground transition-colors group-hover:text-primary">
                    {title}
                </h2>
                <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                    {description}
                </p>
            </div>
            <div>{children}</div>
        </section>
    );
}
