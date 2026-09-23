import type { ReactNode } from "react";

export default function QuranLayout({ children }: { children: ReactNode }) {
    return (
        <section className="h-dvh overflow-hidden bg-background">
            {children}
        </section>
    );
}
