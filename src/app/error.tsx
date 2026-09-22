"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <main className="flex min-h-screen items-center justify-center p-6">
            <section className="flex max-w-md flex-col items-center gap-5 text-center">
                <p className="text-sm font-semibold tracking-[0.2em] text-primary">
                    SOMETHING WENT WRONG
                </p>
                <div className="space-y-2">
                    <h1 className="text-3xl font-semibold">
                        We couldn’t load this page
                    </h1>
                    <p className="text-muted-foreground">
                        Please check your connection and try again. If the
                        problem continues, the Quran data service may be
                        temporarily unavailable.
                    </p>
                </div>
                <Button onClick={reset}>Try again</Button>
            </section>
        </main>
    );
}
