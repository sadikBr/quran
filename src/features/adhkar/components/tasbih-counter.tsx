"use client";

import { Minus, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";

const storageKey = "quran:personal-tasbih:v1";
const vibrationKey = "quran:personal-tasbih:vibration:v1";

export default function TasbihCounter({ ar }: { ar: boolean }) {
    const [count, setCount] = useState(0);
    const current = useRef(0);
    const [ready, setReady] = useState(false);
    const [storageAvailable, setStorageAvailable] = useState(true);
    const [resetOpen, setResetOpen] = useState(false);
    const [vibration, setVibration] = useState(false);
    const [supportsVibration, setSupportsVibration] = useState(false);

    useEffect(() => {
        setSupportsVibration(typeof navigator.vibrate === "function");
        try {
            setVibration(localStorage.getItem(vibrationKey) === "true");
        } catch {
            // The toggle still works for this visit if storage is unavailable.
        }
        try {
            const saved = Number(localStorage.getItem(storageKey) ?? 0);
            current.current =
                Number.isSafeInteger(saved) && saved >= 0 ? saved : 0;
            setCount(current.current);
        } catch {
            setStorageAvailable(false);
        }
        setReady(true);
    }, []);

    function update(next: number) {
        if (!ready || !Number.isSafeInteger(next) || next < 0) return;
        current.current = next;
        setCount(next);
        try {
            localStorage.setItem(storageKey, String(next));
            setStorageAvailable(true);
        } catch {
            setStorageAvailable(false);
        }
    }

    return (
        <section className="mx-auto flex max-w-md flex-col items-center px-2 py-8 text-center sm:py-12">
            <h1 className="text-2xl font-semibold sm:text-3xl">
                {ar ? "المسبحة" : "Tasbih counter"}
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {ar
                    ? "اذكر الله بما شئت، دون عدد محدد."
                    : "Your own dhikr, at your own pace. No prescribed count."}
            </p>
            <button
                type="button"
                disabled={!ready}
                onClick={() => {
                    if (current.current >= Number.MAX_SAFE_INTEGER) return;
                    update(current.current + 1);
                    if (vibration && supportsVibration) {
                        try {
                            navigator.vibrate(15);
                        } catch {
                            // Haptics must never interrupt counting.
                        }
                    }
                }}
                aria-label={ar ? "إضافة تسبيحة" : "Add one dhikr"}
                className="my-8 flex aspect-square w-full max-w-72 touch-manipulation select-none flex-col items-center justify-center gap-5 rounded-full border border-primary/25 bg-primary/5 p-5 text-primary shadow-[inset_0_0_0_10px_var(--background)] transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background active:bg-primary/20 disabled:opacity-50 motion-safe:active:scale-[0.98]"
            >
                <span
                    dir="ltr"
                    aria-live="polite"
                    aria-atomic="true"
                    className="max-w-full break-all font-sans text-5xl font-medium tabular-nums sm:text-6xl"
                >
                    {count}
                </span>
                <span className="text-sm">
                    {ar ? "اضغط للعدّ" : "Tap to count"}
                </span>
            </button>
            <div className="flex w-full max-w-72 gap-3">
                <Button
                    variant="outline"
                    className="min-h-11 flex-1"
                    disabled={!ready || count === 0}
                    onClick={() => update(current.current - 1)}
                >
                    <Minus aria-hidden="true" className="size-4" />
                    {ar ? "تراجع" : "Undo"}
                </Button>
                <Button
                    variant="ghost"
                    className="min-h-11 flex-1"
                    disabled={!ready || count === 0}
                    onClick={() => setResetOpen(true)}
                >
                    <RotateCcw aria-hidden="true" className="size-4" />
                    {ar ? "تصفير" : "Reset"}
                </Button>
            </div>
            <label className="mt-6 flex min-h-11 w-full max-w-72 items-center gap-3 rounded-xl border border-border/60 px-3 text-sm text-muted-foreground">
                <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={vibration}
                    disabled={!ready || !supportsVibration}
                    onChange={(event) => {
                        const enabled = event.target.checked;
                        setVibration(enabled);
                        try {
                            localStorage.setItem(vibrationKey, String(enabled));
                        } catch {
                            setStorageAvailable(false);
                        }
                    }}
                />
                <span>{ar ? "الاهتزاز" : "Vibration"}</span>
                {ready && !supportsVibration && (
                    <span
                        className="ms-auto rounded-full bg-muted px-2 py-1 text-[10px]"
                        title={
                            ar
                                ? "الاهتزاز غير متاح في هذا المتصفح"
                                : "Vibration is unavailable in this browser"
                        }
                    >
                        {ar ? "غير متاح" : "Unavailable"}
                    </span>
                )}
            </label>
            <p
                className="mt-3 max-w-72 text-xs leading-6 text-muted-foreground"
                aria-live="polite"
            >
                {storageAvailable
                    ? ar
                        ? "حفظ تلقائي على هذا الجهاز فقط"
                        : "Automatically saved on this device only"
                    : ar
                      ? "تعذّر حفظ العدد. يمكنك المتابعة، لكنه قد يضيع عند إغلاق الصفحة."
                      : "Saving is unavailable. You can keep counting, but your count may be lost when you leave."}
            </p>
            <ConfirmationDialog
                open={resetOpen}
                onOpenChange={setResetOpen}
                pending={false}
                destructive
                title={ar ? "تصفير المسبحة؟" : "Reset your counter?"}
                description={
                    ar
                        ? "سيعود العدد إلى 0. لن تتأثر أذكارك اليومية."
                        : "Your count will return to 0. Your daily adhkar will not be affected."
                }
                confirmLabel={ar ? "تصفير" : "Reset"}
                cancelLabel={ar ? "إلغاء" : "Cancel"}
                onConfirm={() => {
                    update(0);
                    setResetOpen(false);
                }}
            />
        </section>
    );
}
