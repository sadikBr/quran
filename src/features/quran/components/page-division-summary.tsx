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
            className="flex shrink-0 items-center gap-1.5 whitespace-nowrap sm:gap-2"
        >
            <span className="text-muted-foreground">{label}</span>
            <span className="font-semibold text-foreground/90">
                {formatter.format(hizb)}
            </span>
            {quarter !== undefined && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
                    {quarterLabel} {quarter}/4
                </span>
            )}
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
                                    quarterLabel={t("rubShort")}
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
                            quarterLabel={t("rubShort")}
                        />
                    )}
                </div>
            </dl>
        </aside>
    );
}
