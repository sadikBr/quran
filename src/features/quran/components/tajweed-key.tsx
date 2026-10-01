"use client";
import { useLocale } from "next-intl";

export function TajweedUnavailable() {
    const arabic = useLocale() === "ar";
    return (
        <p aria-live="polite" className="my-4 text-sm text-muted-foreground">
            {arabic
                ? "بعض ألوان التجويد غير متاحة. تُعرض الآيات المتأثرة دون تلوين."
                : "Some Tajweed colours are unavailable. Affected verses are shown without colours."}
        </p>
    );
}
