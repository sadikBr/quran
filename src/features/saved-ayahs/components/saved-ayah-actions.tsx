"use client";

import { LoaderCircle, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import AyahActions from "@/features/quran/components/ayah-actions";
import getAyahActionsData, {
    type AyahActionsData,
} from "@/features/quran/server/get-ayah-actions-data";
import type { SavedAyah } from "../types";

export default function SavedAyahActions({
    ayah,
    onCloseAction,
}: {
    ayah: SavedAyah;
    onCloseAction: () => void;
}) {
    const router = useRouter();
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const [data, setData] = useState<AyahActionsData | null>(null);
    const [loadFailed, setLoadFailed] = useState(false);

    useEffect(() => {
        let cancelled = false;

        getAyahActionsData(ayah.surahNumber, ayah.ayahNumber)
            .then((result) => {
                if (cancelled) return;
                if (result) setData(result);
                else setLoadFailed(true);
            })
            .catch(() => {
                if (!cancelled) setLoadFailed(true);
            });

        return () => {
            cancelled = true;
        };
    }, [ayah.ayahNumber, ayah.surahNumber]);

    useEffect(() => {
        closeButtonRef.current?.focus();

        function closeOnEscape(event: KeyboardEvent) {
            if (event.key === "Escape") onCloseAction();
        }

        window.addEventListener("keydown", closeOnEscape);
        return () => window.removeEventListener("keydown", closeOnEscape);
    }, [onCloseAction]);

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
            <button
                type="button"
                onClick={onCloseAction}
                className="absolute inset-0 bg-foreground/25 backdrop-blur-sm"
                aria-label="Close ayah actions"
            />
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby={data ? "ayah-actions-title" : undefined}
                aria-label={data ? undefined : "Ayah actions"}
                className="relative z-10 max-h-[calc(100dvh-2rem)] w-full max-w-xl overflow-y-auto rounded-2xl border bg-background p-5 shadow-2xl sm:p-7"
            >
                <button
                    ref={closeButtonRef}
                    type="button"
                    onClick={onCloseAction}
                    className="absolute top-4 right-4 z-10 inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Close ayah actions"
                >
                    <X aria-hidden="true" className="size-4" />
                </button>

                {data ? (
                    <AyahActions
                        {...data}
                        onSavedAyahChange={() => router.refresh()}
                    />
                ) : loadFailed ? (
                    <div className="py-14 text-center">
                        <h2 className="font-semibold">
                            We could not load this ayah’s actions.
                        </h2>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Close this window and try again.
                        </p>
                    </div>
                ) : (
                    <div className="flex min-h-52 flex-col items-center justify-center gap-3 text-muted-foreground">
                        <LoaderCircle
                            aria-hidden="true"
                            className="size-5 animate-spin text-primary"
                        />
                        <p className="text-sm">Loading ayah actions…</p>
                    </div>
                )}
            </section>
        </div>
    );
}
