"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useRef } from "react";

export default function AyahActionsModal({
    children,
}: {
    children: ReactNode;
}) {
    const router = useRouter();
    const closeButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        closeButtonRef.current?.focus();

        function closeOnEscape(event: KeyboardEvent) {
            if (event.key === "Escape") {
                router.back();
            }
        }

        window.addEventListener("keydown", closeOnEscape);
        return () => window.removeEventListener("keydown", closeOnEscape);
    }, [router]);

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
            <button
                type="button"
                onClick={() => router.back()}
                className="absolute inset-0 bg-foreground/25 backdrop-blur-sm"
                aria-label="Close ayah actions"
            />
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="ayah-actions-title"
                className="relative z-10 max-h-[calc(100dvh-2rem)] w-full max-w-xl overflow-y-auto rounded-2xl border bg-background p-5 shadow-2xl sm:p-7"
            >
                <button
                    ref={closeButtonRef}
                    type="button"
                    onClick={() => router.back()}
                    className="absolute top-4 right-4 inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Close ayah actions"
                >
                    <X aria-hidden="true" className="size-4" />
                </button>
                {children}
            </section>
        </div>
    );
}
