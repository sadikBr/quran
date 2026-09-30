"use client";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { getGuideProgress, saveGuideProgress } from "./actions";

export default function SettingsNextStep() {
    const ar = useLocale() === "ar";
    const router = useRouter();
    const saving = useRef(false);
    const [loaded, setLoaded] = useState(false);
    const [done, setDone] = useState(false);
    const [pending, setPending] = useState(false);
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
    async function finish(openGuide = false) {
        if (saving.current) return;
        saving.current = true;
        setPending(true);
        setError(false);
        try {
            const result = await saveGuideProgress("settings-complete", true);
            if (!result.success) throw new Error();
            setDone(true);
            if (openGuide) router.push("/guide");
            router.refresh();
        } catch {
            setError(true);
        } finally {
            setPending(false);
            saving.current = false;
        }
    }
    if (!loaded || done) return null;
    return (
        <section className="mt-8 rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:p-6">
            <h2 className="text-lg font-semibold">
                {ar ? "ضبطت تفضيلاتك؟" : "Preferences ready?"}
            </h2>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
                {ar
                    ? "تأكّد من حفظ تغييراتك أعلاه. إن أردت التعرّف على الورد والحفظ والتكاليف، تجد جولات قصيرة في دليل الاستخدام. ويمكنك الرجوع إليه من القائمة متى شئت."
                    : "Make sure your changes above are saved. For help with wird, memorization and assignments, explore the short tours in the user guide. It’s always available in the menu."}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
                <Button
                    type="button"
                    disabled={pending}
                    onClick={() => finish(true)}
                    className="min-h-11 rounded-xl"
                >
                    {ar ? "استكشف دليل الاستخدام" : "Explore the user guide"}
                </Button>
                <Button
                    variant="outline"
                    type="button"
                    className="min-h-11 rounded-xl"
                    disabled={done || pending}
                    onClick={() => finish()}
                >
                    {ar
                        ? done
                            ? "تم، أهلًا بك!"
                            : "انتهيت، لا أحتاج إلى جولة"
                        : done
                          ? "You’re all set!"
                          : "I’m ready, no tour needed"}
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
