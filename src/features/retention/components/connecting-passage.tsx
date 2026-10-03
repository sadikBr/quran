"use client";
import { Link2 } from "lucide-react";
import { useTranslations } from "next-intl";
import QuranText from "@/features/quran/components/quran-text";
import type { ExerciseVerse } from "../types";

export default function ConnectingPassage({
    verses,
    riwayah,
}: {
    verses: ExerciseVerse[];
    riwayah: "hafs" | "warsh";
}) {
    const t = useTranslations("Memorization.retention");
    if (!verses.length) return null;
    return (
        <section
            id="connecting-passage"
            className="mt-6 scroll-mt-28 rounded-3xl border border-primary/20 bg-primary/[0.04] p-5 sm:p-6"
        >
            <h2 className="flex items-center gap-2 font-semibold text-primary">
                <Link2 className="size-5" aria-hidden="true" />
                {t("connectingTitle")}
            </h2>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
                {t("connectingDescription")}
            </p>
            <div
                dir="rtl"
                lang="ar"
                data-riwayah={riwayah}
                className="ayah assignment-review-quran quran-reader-text mt-4 text-center leading-[2.5]"
            >
                {verses.map((v) => (
                    <span key={v.ayahNumber}>
                        <QuranText text={v.text} />{" "}
                        <span className="text-primary">
                            ﴿{v.ayahNumber}﴾
                        </span>{" "}
                    </span>
                ))}
            </div>
        </section>
    );
}
