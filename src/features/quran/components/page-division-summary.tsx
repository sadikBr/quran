"use client";

import { useLocale, useTranslations } from "next-intl";

function LocalizedNumberList({ values }: { values: number[] }) {
    const locale = useLocale();
    const formatter = new Intl.NumberFormat(locale, { useGrouping: false });
    const listFormatter = new Intl.ListFormat(locale, {
        style: "short",
        type: "conjunction",
    });

    return listFormatter.format(values.map((value) => formatter.format(value)));
}

function HizbMarker({
    hizb,
    quarter,
    label,
    quarterLabel,
}: {
    hizb: number;
    quarter?: number;
    label: string;
    quarterLabel: string;
}) {
    const locale = useLocale();
    const formatter = new Intl.NumberFormat(locale, { useGrouping: false });

    return (
        <div
            dir={locale === "ar" ? "rtl" : "ltr"}
            className="flex min-h-9 shrink-0 items-center gap-2 whitespace-nowrap sm:gap-2.5"
        >
            {quarter !== undefined && (
                <span
                    dir={locale === "ar" ? "rtl" : "ltr"}
                    className="inline-flex items-baseline gap-1 font-semibold text-primary tabular-nums"
                >
                    <span className="hidden text-[9px] font-medium opacity-70 min-[390px]:inline sm:text-[10px]">
                        {quarterLabel}
                    </span>
                    <span dir="ltr">{quarter}/4</span>
                </span>
            )}
            {quarter !== undefined && (
                <span aria-hidden="true" className="h-4 w-px bg-border/70" />
            )}
            <span className="text-[10px] font-medium text-muted-foreground sm:text-[11px]">
                {label}
            </span>
            <span className="text-base font-bold text-foreground tabular-nums sm:text-lg">
                {formatter.format(hizb)}
            </span>
        </div>
    );
}

export default function PageDivisionSummary({
    surahNames,
    juzs,
    hizbs,
    hizbQuarters,
}: {
    surahNames: string[];
    juzs: number[];
    hizbs: number[];
    hizbQuarters: number[];
}) {
    const t = useTranslations("Reader.divisions");
    const quartersByHizb = new Map<number, number[]>();
    for (const quarter of hizbQuarters) {
        const hizb = Math.ceil(quarter / 4);
        const quarters = quartersByHizb.get(hizb) ?? [];
        quarters.push(((quarter - 1) % 4) + 1);
        quartersByHizb.set(hizb, quarters);
    }
    const hizbMarkers = hizbs.map((hizb) => ({
        hizb,
        quarter: quartersByHizb.get(hizb)?.[0],
    }));
    const rightHizb = hizbMarkers[0];
    const leftHizbs =
        hizbMarkers.length === 1
            ? rightHizb
                ? [
                      {
                          ...rightHizb,
                          quarter:
                              quartersByHizb.get(rightHizb.hizb)?.at(-1) ??
                              rightHizb.quarter,
                      },
                  ]
                : []
            : hizbMarkers.slice(1);

    return (
        <aside
            aria-label={t("pageSummary")}
            className="mb-2 min-w-0 shrink-0 px-1 py-1 text-[11px] text-muted-foreground sm:px-2 sm:text-xs"
        >
            <dl
                dir="ltr"
                className="relative grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 rounded-2xl bg-muted/25 px-3 py-3 text-center sm:gap-6 sm:px-5 sm:py-3.5"
            >
                <div className="flex min-w-0 justify-start">
                    {leftHizbs.length > 0 && (
                        <div className="flex flex-nowrap gap-x-3">
                            {leftHizbs.map((marker) => (
                                <HizbMarker
                                    key={marker.hizb}
                                    hizb={marker.hizb}
                                    quarter={marker.quarter}
                                    label={t("hizb")}
                                    quarterLabel={t("rub")}
                                />
                            ))}
                        </div>
                    )}
                </div>
                <div className="min-w-24 justify-self-center border-border/60 border-x px-3 sm:min-w-36 sm:px-6">
                    <p
                        dir="auto"
                        className="max-w-48 truncate text-sm font-semibold leading-relaxed text-primary sm:text-base"
                        title={surahNames.join(" · ")}
                    >
                        {surahNames.join(" · ")}
                    </p>
                    <div className="mt-1 flex items-baseline justify-center gap-1.5">
                        <dt className="text-[9px] font-semibold tracking-[0.12em] text-muted-foreground uppercase sm:text-[10px]">
                            {t("juz")}
                        </dt>
                        <dd className="text-lg font-bold text-foreground sm:text-xl">
                            <LocalizedNumberList values={juzs} />
                        </dd>
                    </div>
                </div>
                <div className="flex min-w-0 justify-end">
                    {rightHizb && (
                        <HizbMarker
                            hizb={rightHizb.hizb}
                            quarter={rightHizb.quarter}
                            label={t("hizb")}
                            quarterLabel={t("rub")}
                        />
                    )}
                </div>
            </dl>
        </aside>
    );
}
