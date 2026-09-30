"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { saveGuideProgress } from "./actions";
import { guides, isGuideId } from "./guides";

export default function TourRunner() {
    const params = useSearchParams();
    const pathname = usePathname();
    const id = params.get("tour") ?? "";
    if (!isGuideId(id) || pathname !== guides[id].path) return null;
    return <ActiveTour key={`${pathname}:${id}`} id={id} />;
}
function ActiveTour({ id }: { id: keyof typeof guides }) {
    const router = useRouter();
    const params = useSearchParams();
    const pathname = usePathname();
    const ar = useLocale() === "ar";
    const [step, setStep] = useState(0);
    const [pending, setPending] = useState(false);
    const [error, setError] = useState(false);
    const [missing, setMissing] = useState(false);
    const heading = useRef<HTMLHeadingElement>(null);
    const guide = guides[id];
    const current = guide.steps[step];
    function close() {
        const query = new URLSearchParams(params.toString());
        query.delete("tour");
        router.replace(`${pathname}${query.size ? `?${query}` : ""}`, {
            scroll: false,
        });
    }
    useEffect(() => {
        void saveGuideProgress("welcome", true).catch(() => setError(true));
    }, []);
    useEffect(() => {
        heading.current?.focus({ preventScroll: true });
        const target = document.querySelector<HTMLElement>(
            `[data-tour="${current.target}"]`,
        );
        setMissing(!target);
        target?.classList.add("tour-highlight");
        target?.scrollIntoView({ block: "start", behavior: "instant" });
        return () => target?.classList.remove("tour-highlight");
    }, [current]);
    async function finish() {
        setPending(true);
        setError(false);
        try {
            const result = await saveGuideProgress(id, true);
            if (!result.success) throw new Error();
            close();
        } catch {
            setError(true);
        } finally {
            setPending(false);
        }
    }
    return (
        <>
            <div className="h-72" aria-hidden="true" />
            <aside
                role="dialog"
                aria-modal="false"
                aria-labelledby="tour-heading"
                dir={ar ? "rtl" : "ltr"}
                onKeyDown={(event) => {
                    if (event.key === "Escape") close();
                }}
                className="fixed inset-x-3 bottom-3 z-50 mx-auto max-h-[45dvh] max-w-xl overflow-y-auto rounded-2xl border border-primary/30 bg-popover p-4 text-popover-foreground shadow-2xl sm:p-5"
            >
                <div className="flex items-center justify-between gap-3">
                    <h2
                        id="tour-heading"
                        ref={heading}
                        tabIndex={-1}
                        className="font-semibold outline-none"
                    >
                        {guide.title[ar ? 1 : 0]} · {step + 1}/
                        {guide.steps.length}
                    </h2>
                    <Button variant="ghost" onClick={close}>
                        {ar ? "خروج" : "Exit"}
                    </Button>
                </div>
                <p className="mt-2 text-sm leading-7">
                    {current.text[ar ? 1 : 0]}
                </p>
                {missing && (
                    <p className="mt-2 text-xs text-muted-foreground">
                        {ar
                            ? "قد يظهر هذا القسم بعد إعداد الميزة أو إضافة بيانات."
                            : "This section may appear after setup or once data is available."}
                    </p>
                )}
                {error && (
                    <p role="alert" className="mt-2 text-sm text-destructive">
                        {ar
                            ? "تعذّر حفظ التقدّم. حاول مجددًا أو اخرج دون حفظ."
                            : "Could not save progress. Retry or exit without saving."}
                    </p>
                )}
                <div className="mt-4 flex justify-between gap-3">
                    <Button
                        variant="outline"
                        disabled={step === 0 || pending}
                        onClick={() => setStep((value) => value - 1)}
                    >
                        {ar ? "السابق" : "Back"}
                    </Button>
                    <Button
                        disabled={pending}
                        onClick={() =>
                            step === guide.steps.length - 1
                                ? void finish()
                                : setStep((value) => value + 1)
                        }
                    >
                        {step === guide.steps.length - 1
                            ? ar
                                ? "إنهاء الجولة"
                                : "Finish"
                            : ar
                              ? "التالي"
                              : "Next"}
                    </Button>
                </div>
            </aside>
        </>
    );
}
