"use client";

import { useLocale } from "next-intl";
import type { PracticeReaderGroup } from "@/features/practice/reader-types";
import TajweedText from "@/features/quran/components/tajweed-text";
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
        <div className="space-y-10">
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
                        className="ayah assignment-review-quran quran-reader-text rounded-3xl bg-muted/25 px-5 py-7 text-center leading-[2.6] ring-1 ring-border/40 sm:px-8 sm:py-9"
                    >
                        {group.ayahs.map((ayah) => (
                            <span
                                key={ayah.number}
                                className="me-[0.35em] inline"
                            >
                                <TajweedText text={ayah.text} />{" "}
                                <span className="frame inline-block align-[0.08em] text-sidebar-accent">
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
