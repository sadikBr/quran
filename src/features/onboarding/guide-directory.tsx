"use client";
import { BookOpen } from "lucide-react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { useEffect, useState } from "react";
import ActionCard from "@/components/action-card";
import PageHeading from "@/components/page-heading";
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
        <section
            className={
                welcome
                    ? "app-card my-6 p-4 sm:p-5"
                    : "pb-12 pt-5 sm:pb-16 sm:pt-8"
            }
        >
            {welcome ? (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="font-semibold">
                            {ar
                                ? "اجعل القارئ مناسبًا لك"
                                : "Make the reader yours"}
                        </h2>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                            {ar
                                ? "اختر لغتك وروايتك ومظهرك المفضّل."
                                : "Choose your language, riwayah, and preferred appearance."}
                        </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                        <Button
                            asChild
                            variant="outline"
                            className="min-h-11 rounded-xl"
                        >
                            <Link href="/settings">
                                {ar ? "ضبط التفضيلات" : "Set preferences"}
                            </Link>
                        </Button>
                        <Button
                            variant="ghost"
                            disabled={pending}
                            onClick={dismiss}
                            className="min-h-11 rounded-xl"
                        >
                            {ar ? "ليس الآن" : "Not now"}
                        </Button>
                    </div>
                </div>
            ) : (
                <>
                    <PageHeading
                        title={ar ? "دليل الاستخدام" : "User guide"}
                        description={
                            ar
                                ? "جولات قصيرة للتعرّف على التطبيق. يمكنك إعادتها في أي وقت."
                                : "Short tours to help you get started. Replay them anytime."
                        }
                        icon={<BookOpen />}
                    />
                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                        {Object.entries(guides).map(([id, guide]) => (
                            <ActionCard
                                key={id}
                                href={`${guide.path}?tour=${id}`}
                                icon={<BookOpen />}
                                title={guide.title[ar ? 1 : 0]}
                                description={
                                    progress?.some(
                                        (row) =>
                                            row.guideId === id && row.completed,
                                    )
                                        ? ar
                                            ? "اكتملت · إعادة الجولة"
                                            : "Completed · Replay"
                                        : ar
                                          ? "ابدأ الجولة · 3 خطوات"
                                          : "Start tour · 3 steps"
                                }
                            />
                        ))}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-4 text-sm">
                        <Link
                            className="inline-flex min-h-11 items-center text-primary underline underline-offset-4"
                            href="/azkar"
                        >
                            {ar ? "الأذكار والعدّاد" : "Adhkar and counter"}
                        </Link>
                        <Link
                            className="inline-flex min-h-11 items-center text-primary underline underline-offset-4"
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
