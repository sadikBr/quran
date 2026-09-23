import type { ReactNode } from "react";

export default function QuranLayout({
    children,
    ayah,
}: {
    children: ReactNode;
    ayah: ReactNode;
}) {
    return (
        <section className="h-dvh select-none overflow-hidden bg-background">
            {children}
            {ayah}
        </section>
    );
}
