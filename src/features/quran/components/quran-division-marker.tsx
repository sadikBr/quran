"use client";

import { useLocale, useTranslations } from "next-intl";
import type { QuranDivisionMarker as QuranDivisionMarkerType } from "../navigation-types";

export default function QuranDivisionMarker({
    marker,
}: {
    marker: QuranDivisionMarkerType;
}) {
    const t = useTranslations("Reader.divisions");
    const locale = useLocale();
    const quarterPosition = marker.hizbQuarterNumber
        ? ((marker.hizbQuarterNumber - 1) % 4) + 1
        : undefined;
    const labels = [
        marker.juzNumber !== undefined
            ? t("juzNumber", { number: marker.juzNumber })
            : null,
        marker.hizbNumber !== undefined
            ? t("hizbNumber", { number: marker.hizbNumber })
            : null,
        quarterPosition !== undefined
            ? t("quarterNumber", { number: String(quarterPosition) })
            : null,
    ].filter((label): label is string => label !== null);

    return (
        <div
            dir={locale === "ar" ? "rtl" : "ltr"}
            className="my-6 flex items-center gap-3 font-sans text-xs leading-none text-muted-foreground sm:my-8"
        >
            <span aria-hidden="true" className="h-px flex-1 bg-border/70" />
            <div className="flex shrink-0 items-center gap-2 rounded-full bg-primary/8 px-3 py-2 font-medium text-primary">
                {labels.map((label, index) => (
                    <span key={label} className="contents">
                        {index > 0 && (
                            <span
                                aria-hidden="true"
                                className="text-primary/35"
                            >
                                ·
                            </span>
                        )}
                        <span>{label}</span>
                    </span>
                ))}
            </div>
            <span aria-hidden="true" className="h-px flex-1 bg-border/70" />
        </div>
    );
}
