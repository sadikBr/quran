"use client";

import { useLocale } from "next-intl";
import type { PracticeReaderGroup } from "@/features/practice/reader-types";
import QuranText from "@/features/quran/components/quran-text";
import { getArabicNumber } from "@/lib/arabic-numbers";

export default function AssignmentReviewReader({
    groups,
    riwayah,
}: {
    groups: PracticeReaderGroup[];
    riwayah: "hafs" | "warsh";
}) {
    const locale = useLocale();

    return (
        <div className="min-w-0 space-y-6 sm:space-y-8">
            {groups.map((group) => (
                <section key={group.surah.number}>
                    <div className="mb-6 flex items-center gap-4">
                        <span className="h-px flex-1 bg-primary/20" />
                        <div className="text-center">
                            <p className="surah-name text-3xl leading-none text-primary">
                                {getArabicNumber(group.surah.number)}
                            </p>
                            <h2 className="mt-1 text-sm font-semibold">
                                {locale === "ar"
                                    ? group.surah.name
                                    : group.surah.englishName}
                            </h2>
                        </div>
                        <span className="h-px flex-1 bg-primary/20" />
                    </div>
                    <div
                        dir="rtl"
                        lang="ar"
                        data-riwayah={riwayah}
                        className="ayah assignment-review-quran quran-reader-text rounded-2xl border border-border/50 bg-card/60 px-3 py-5 text-center leading-[2.6] sm:px-5 sm:py-7"
                    >
                        {group.ayahs.map((ayah) => (
                            <span
                                key={ayah.number}
                                className="me-[0.35em] inline"
                            >
                                <QuranText text={ayah.text} />{" "}
                                <span className="frame inline-block align-[0.08em] text-primary">
                                    {getArabicNumber(ayah.numberInSurah)}
                                </span>{" "}
                            </span>
                        ))}
                    </div>
                </section>
            ))}
        </div>
    );
}
