"use client";

import { TriangleAlert, X } from "lucide-react";
import { useLocale } from "next-intl";
import { Dialog } from "radix-ui";
import type { Reciter, SurahType } from "../types";

export default function ReciterCoverage({
    reciter,
    surahs,
}: {
    reciter?: Reciter;
    surahs: SurahType[];
}) {
    const ar = useLocale() === "ar";
    if (!reciter?.availableSurahs) return null;
    const available = new Set(reciter.availableSurahs);
    if (available.size === 114) return null;
    const showMissing = available.size > 57;
    const numbers = Array.from({ length: 114 }, (_, i) => i + 1).filter((n) =>
        showMissing ? !available.has(n) : available.has(n),
    );
    return (
        <Dialog.Root>
            <Dialog.Trigger
                type="button"
                aria-label={
                    ar
                        ? "تسجيلات غير مكتملة — عرض التفاصيل"
                        : "Incomplete recordings — view details"
                }
                title={ar ? "تسجيلات غير مكتملة" : "Incomplete recordings"}
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
                <TriangleAlert aria-hidden="true" className="size-[18px]" />
            </Dialog.Trigger>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/55 backdrop-blur-sm" />
                <Dialog.Content
                    dir={ar ? "rtl" : "ltr"}
                    className={`fixed left-1/2 top-1/2 z-[61] max-h-[80dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border bg-background p-6 text-foreground shadow-xl ${ar ? "arabic-ui" : ""}`}
                >
                    <Dialog.Title className="pe-8 text-lg font-semibold">
                        {ar ? "تسجيلات غير مكتملة" : "Incomplete recordings"}
                    </Dialog.Title>
                    <Dialog.Description className="mt-2 text-sm leading-6 text-muted-foreground">
                        {ar
                            ? (reciter.arabicName ?? reciter.name)
                            : reciter.name}
                        <br />
                        {ar
                            ? `${available.size} من 114 سورة متاحة`
                            : `${available.size} of 114 surahs available`}
                    </Dialog.Description>
                    <Dialog.Close
                        aria-label={ar ? "إغلاق" : "Close"}
                        className="absolute end-3 top-3 flex size-11 items-center justify-center rounded-full hover:bg-muted"
                    >
                        <X className="size-4" />
                    </Dialog.Close>
                    <p className="mt-5 text-sm font-medium">
                        {numbers.length === 0
                            ? ar
                                ? "جميع السور متاحة"
                                : "All surahs are available"
                            : showMissing
                              ? ar
                                  ? "السور غير المتاحة"
                                  : "Unavailable surahs"
                              : ar
                                ? "السور المتاحة"
                                : "Available surahs"}
                    </p>
                    <ul className="mt-3 grid grid-cols-2 gap-2">
                        {numbers.map((number) => {
                            const surah = surahs.find(
                                (s) => s.number === number,
                            );
                            return (
                                <li key={number}>
                                    <div className="flex min-h-12 items-center gap-2 rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-sm">
                                        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs text-primary tabular-nums">
                                            {number}
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            {surah
                                                ? ar
                                                    ? surah.name
                                                    : surah.englishName
                                                : ar
                                                  ? `سورة ${number}`
                                                  : `Surah ${number}`}
                                        </span>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
