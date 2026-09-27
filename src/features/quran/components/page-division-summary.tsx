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
            className="flex min-h-10 shrink-0 items-center gap-1 rounded-full bg-muted/55 p-1 pe-2.5 whitespace-nowrap shadow-black/5 shadow-sm sm:min-h-11 sm:gap-1.5 sm:pe-3"
        >
            {quarter !== undefined && (
                <span
                    dir={locale === "ar" ? "rtl" : "ltr"}
                    className="inline-flex min-h-8 items-center gap-1 rounded-full bg-primary/12 px-2 font-semibold text-primary tabular-nums sm:min-h-9 sm:px-2.5"
                >
                    <span className="hidden text-[9px] font-medium opacity-75 min-[390px]:inline sm:text-[10px]">
                        {quarterLabel}
                    </span>
                    <span dir="ltr">{quarter}/4</span>
                </span>
            )}
            <span className="ms-0.5 text-[10px] font-medium text-muted-foreground sm:text-[11px]">
                {label}
            </span>
            <span className="text-sm font-bold text-foreground tabular-nums sm:text-base">
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
            className="mb-4 min-w-0 text-[11px] text-muted-foreground sm:text-xs"
        >
            <p className="mb-3 flex items-center justify-center gap-3 text-center text-sm font-semibold leading-relaxed text-primary sm:text-base">
                <span aria-hidden="true" className="h-px w-8 bg-primary/30" />
                {surahNames.join(" · ")}
                <span aria-hidden="true" className="h-px w-8 bg-primary/30" />
            </p>
            <dl
                dir="ltr"
                className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 text-center sm:gap-4"
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
                <div className="justify-self-center rounded-2xl bg-primary/10 px-3 py-1.5 text-primary sm:px-5">
                    <dt className="text-[9px] font-semibold tracking-[0.14em] uppercase">
                        {t("juz")}
                    </dt>
                    <dd className="mt-0.5 text-base font-semibold text-foreground sm:text-lg">
                        <LocalizedNumberList values={juzs} />
                    </dd>
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
