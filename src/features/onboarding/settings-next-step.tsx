"use client";
import { useLocale } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getGuideProgress } from "./actions";

export default function SettingsNextStep({
    saved,
    pending,
    onContinue,
}: {
    saved: boolean;
    pending: boolean;
    onContinue: (openGuide: boolean) => Promise<void>;
}) {
    const ar = useLocale() === "ar";
    const [loaded, setLoaded] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState(false);
    useEffect(() => {
        let active = true;
        getGuideProgress()
            .then((rows) => {
                if (!active) return;
                setDone(
                    rows === null ||
                        rows.some(
                            (row) =>
                                row.guideId === "settings-complete" &&
                                row.completed,
                        ),
                );
                setLoaded(true);
            })
            .catch(() => {
                if (active) {
                    setError(true);
                    setLoaded(true);
                }
            });
        return () => {
            active = false;
        };
    }, []);
    if (!loaded || done || saved) return null;
    return (
        <section className="mt-8 rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:p-6">
            <h2 className="text-lg font-semibold">
                {ar ? "ضبطت تفضيلاتك؟" : "Preferences ready?"}
            </h2>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
                {ar
                    ? "احفظ تفضيلاتك وابدأ الاستخدام، أو تابع إلى الدليل للتعرّف على التطبيق. يمكنك فتح الدليل من القائمة في أي وقت."
                    : "Save your preferences and get started, or continue to the guide for a quick introduction. The guide is always available in the menu."}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
                <Button
                    type="button"
                    disabled={pending}
                    onClick={() => onContinue(true)}
                    className="min-h-11 rounded-xl"
                >
                    {ar
                        ? "احفظ وانتقل إلى الدليل"
                        : "Save and explore the guide"}
                </Button>
                <Button
                    variant="outline"
                    type="button"
                    className="min-h-11 rounded-xl"
                    disabled={done || pending}
                    onClick={() => onContinue(false)}
                >
                    {ar
                        ? done
                            ? "تم، أهلًا بك!"
                            : "احفظ، لا أحتاج إلى جولة"
                        : done
                          ? "You’re all set!"
                          : "Save, no tour needed"}
                </Button>
            </div>
            {error && (
                <p role="alert" className="mt-3 text-sm text-destructive">
                    {ar
                        ? "تعذّر حفظ إتمام الإعداد. حاول مجددًا."
                        : "Could not save setup completion. Please try again."}
                </p>
            )}
        </section>
    );
}
