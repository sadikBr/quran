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
        <section className="grid gap-3 py-5 first:pt-0 sm:grid-cols-[minmax(0,1fr)_11rem] sm:items-center sm:gap-8">
            <div>
                <h2 className="font-medium text-foreground">{title}</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {description}
                </p>
            </div>
            <div>{children}</div>
        </section>
    );
}
