"use client";
import { Eye, NotebookPen } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { toast } from "sonner";
import PageHeading from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import QuranText from "@/features/quran/components/quran-text";
import { updateMemorizationMistake } from "../server/actions";
import { opening } from "../similar";
import type { ExerciseVerse, MistakeView } from "../types";

export default function MistakePractice({
    item,
    verses,
}: {
    item: MistakeView;
    verses: ExerciseVerse[];
}) {
    const t = useTranslations("Memorization.retention"),
        locale = useLocale(),
        router = useRouter();
    const [revealed, setRevealed] = useState(false),
        [busy, setBusy] = useState(false);
    const pending = useRef(false),
        request = useRef<string | null>(null);
    const first = verses[0];
    return (
        <div className="mx-auto max-w-3xl space-y-6">
            <PageHeading
                title={t("focusedPractice")}
                description={t("focusedDescription")}
                icon={<NotebookPen />}
            />
            <section className="app-card p-5 sm:p-8">
                <p className="text-sm font-semibold text-primary">
                    {locale === "ar" ? first.surahName : first.englishName} ·{" "}
                    {t("ayahNumber", { number: first.ayahNumber })} ·{" "}
                    {t(`kinds.${item.kind}`)}
                </p>
                {item.note && (
                    <p
                        dir="auto"
                        className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-muted-foreground"
                    >
                        {item.note}
                    </p>
                )}
                <p className="mt-5 text-sm text-muted-foreground">
                    {t("recallPrompt")}
                </p>
                <div
                    dir="rtl"
                    lang="ar"
                    data-riwayah={item.riwayah}
                    className="ayah assignment-review-quran quran-reader-text my-6 text-center leading-[2.5]"
                >
                    {revealed ? (
                        verses.map((v) => (
                            <p key={v.ayahNumber}>
                                <QuranText text={v.text} />{" "}
                                <span className="text-primary">
                                    ﴿{v.ayahNumber}﴾
                                </span>
                            </p>
                        ))
                    ) : (
                        <p>
                            <QuranText text={opening(first.text)} /> …
                        </p>
                    )}
                </div>
                <div className="flex flex-wrap gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        className="min-h-11 rounded-xl"
                        onClick={() => setRevealed(!revealed)}
                        aria-pressed={revealed}
                    >
                        <Eye className="size-4" />
                        {t(revealed ? "hideAnswer" : "revealAnswer")}
                    </Button>
                    {revealed && (
                        <Button
                            type="button"
                            disabled={busy}
                            className="min-h-11 rounded-xl"
                            onClick={async () => {
                                if (pending.current) return;
                                pending.current = true;
                                setBusy(true);
                                request.current ??= crypto.randomUUID();
                                try {
                                    const result =
                                        await updateMemorizationMistake({
                                            id: item.id,
                                            revision: item.revision,
                                            action: "practised",
                                            eventId: request.current,
                                        });
                                    if (!result.success) {
                                        toast.error(
                                            t(
                                                result.reason === "stale"
                                                    ? "stale"
                                                    : result.reason ===
                                                        "unavailable"
                                                      ? "notMemorized"
                                                      : "saveError",
                                            ),
                                        );
                                        router.refresh();
                                        return;
                                    }
                                    toast.success(t("practiceSaved"));
                                    router.push("/memorization/mistakes");
                                    router.refresh();
                                } catch {
                                    toast.error(t("saveError"));
                                } finally {
                                    pending.current = false;
                                    setBusy(false);
                                }
                            }}
                        >
                            {t(busy ? "saving" : "finishPractice")}
                        </Button>
                    )}
                </div>
            </section>
        </div>
    );
}
