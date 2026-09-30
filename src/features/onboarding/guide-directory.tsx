"use client";
import Link from "next/link";
import { useLocale } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getGuideProgress, saveGuideProgress } from "./actions";
import { guides } from "./guides";

export default function GuideDirectory({
    welcome = false,
}: {
    welcome?: boolean;
}) {
    const ar = useLocale() === "ar";
    const [progress, setProgress] =
        useState<Awaited<ReturnType<typeof getGuideProgress>>>();
    const [error, setError] = useState(false);
    const [pending, setPending] = useState(false);
    useEffect(() => {
        let active = true;
        getGuideProgress()
            .then((value) => {
                if (active) setProgress(value);
            })
            .catch(() => {
                if (active) setError(true);
            });
        return () => {
            active = false;
        };
    }, []);
    if (
        welcome &&
        (!progress || progress.some((row) => row.guideId === "welcome"))
    )
        return null;
    async function dismiss() {
        setPending(true);
        setError(false);
        try {
            const result = await saveGuideProgress("welcome", true);
            if (!result.success) throw new Error();
            setProgress((rows) => [
                ...(rows ?? []),
                { userId: "", guideId: "welcome", completed: true },
            ]);
        } catch {
            setError(true);
        } finally {
            setPending(false);
        }
    }
    return (
        <section className="my-6 rounded-2xl border border-primary/20 bg-card/80 p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="text-xl font-semibold">
                        {ar
                            ? welcome
                                ? "أهلًا بك، لنضبط التطبيق على ما يناسبك"
                                : "دليل الاستخدام"
                            : welcome
                              ? "Welcome—make the app yours"
                              : "User guide"}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {welcome
                            ? ar
                                ? "ابدأ باختيار اللغة والرواية والمظهر والتذكيرات من الإعدادات. وبعدها يمكنك زيارة دليل الاستخدام إن احتجت إلى مساعدة."
                                : "Start with your language, riwayah, appearance and reminders in Settings. Then explore the user guide if you need help."
                            : ar
                              ? "جولات قصيرة للتعرّف على التطبيق. يمكنك الخروج في أي وقت وإعادتها من القائمة."
                              : "Short tours to help you get started. Leave anytime and replay them from the menu."}
                    </p>
                </div>
                {welcome && (
                    <Button
                        variant="ghost"
                        disabled={pending}
                        onClick={dismiss}
                    >
                        {ar ? "ليس الآن" : "Not now"}
                    </Button>
                )}
            </div>
            {welcome ? (
                <Button asChild className="mt-5 min-h-11 rounded-xl">
                    <Link href="/settings">
                        {ar ? "ابدأ بضبط تفضيلاتك" : "Set up your preferences"}
                    </Link>
                </Button>
            ) : (
                <>
                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                        {Object.entries(guides).map(([id, guide]) => (
                            <Link
                                key={id}
                                href={`${guide.path}?tour=${id}`}
                                className="rounded-xl border border-border bg-background/60 p-4 transition-colors hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                <h3 className="font-semibold text-primary">
                                    {guide.title[ar ? 1 : 0]}
                                </h3>
                                <p className="mt-2 text-xs text-muted-foreground">
                                    {progress?.some(
                                        (row) =>
                                            row.guideId === id && row.completed,
                                    )
                                        ? ar
                                            ? "اكتملت · إعادة الجولة"
                                            : "Completed · Replay"
                                        : ar
                                          ? "ابدأ الجولة · 3 خطوات"
                                          : "Start tour · 3 steps"}
                                </p>
                            </Link>
                        ))}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-4 text-sm">
                        <Link
                            className="text-primary underline underline-offset-4"
                            href="/azkar"
                        >
                            {ar ? "الأذكار والعدّاد" : "Adhkar and counter"}
                        </Link>
                        <Link
                            className="text-primary underline underline-offset-4"
                            href="/groups"
                        >
                            {ar
                                ? "الحلقات والاجتماعات"
                                : "Halaqas and meetings"}
                        </Link>
                    </div>
                </>
            )}
            {error && (
                <p role="alert" className="mt-3 text-sm text-destructive">
                    {ar
                        ? "تعذّر حفظ أو تحميل تقدّم الدليل. يمكنك استخدام الجولات والمحاولة لاحقًا."
                        : "Could not save or load guide progress. Tours remain available; please try again later."}
                </p>
            )}
        </section>
    );
}
