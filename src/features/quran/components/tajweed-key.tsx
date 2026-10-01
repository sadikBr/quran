"use client";
import { useLocale } from "next-intl";
import { TAJWEED_RULES } from "../helpers/quranpedia-tajweed";

export function TajweedUnavailable() {
    const arabic = useLocale() === "ar";
    return (
        <p aria-live="polite" className="my-4 text-sm text-muted-foreground">
            {arabic
                ? "تعذّر تحميل ألوان التجويد الآن. يُعرض النص دون تلوين؛ أعد المحاولة لاحقًا."
                : "Tajweed colours are unavailable right now. Showing plain text; please try again later."}
        </p>
    );
}

export default function TajweedKey() {
    const arabic = useLocale() === "ar";
    return (
        <div className="my-4 text-sm text-muted-foreground">
            <details>
                <summary className="cursor-pointer">
                    {arabic ? "دليل ألوان التجويد" : "Tajweed colour key"}
                </summary>
                <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
                    {Object.entries(TAJWEED_RULES).map(([rule, labels]) => (
                        <li key={rule}>
                            <span aria-hidden="true" data-tajweed={rule}>
                                ●
                            </span>{" "}
                            {labels[arabic ? 0 : 1]}
                        </li>
                    ))}
                </ul>
            </details>
        </div>
    );
}
