"use client";
import Link from "next/link";
import { useLocale } from "next-intl";
import type { Reciter } from "../types";

export default function MissingRecitation({
    reciter,
    surahNumber,
}: {
    reciter?: Reciter;
    surahNumber: number;
}) {
    const ar = useLocale() === "ar";
    if (
        !reciter?.availableSurahs ||
        reciter.availableSurahs.includes(surahNumber)
    )
        return null;
    return (
        <p className="my-3 text-center text-xs leading-6 text-muted-foreground">
            {ar
                ? "لا يتوفر تسجيل لهذه السورة بصوت القارئ المختار."
                : "This surah has no recording by your selected reciter."}{" "}
            <Link
                href="/settings#reciter"
                className="inline-flex min-h-11 items-center text-primary underline underline-offset-4"
            >
                {ar ? "تغيير القارئ" : "Change reciter"}
            </Link>
        </p>
    );
}
