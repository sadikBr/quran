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

function LocalizedQuarterList({ values }: { values: number[] }) {
    const locale = useLocale();
    const listFormatter = new Intl.ListFormat(locale, {
        style: "short",
        type: "conjunction",
    });

    return listFormatter.format(values.map((value) => `${value}/4`));
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
    const quarterPositions = [
        ...new Set(hizbQuarters.map((quarter) => ((quarter - 1) % 4) + 1)),
    ];

    return (
        <aside
            aria-label={t("pageSummary")}
            className="mb-4 flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-[11px] text-muted-foreground sm:text-xs"
        >
            <p className="font-semibold tracking-[0.08em] text-primary">
                {surahNames.join(" · ")}
            </p>
            <span aria-hidden="true" className="text-primary/35">
                •
            </span>
            <dl className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
                <div className="flex items-baseline gap-1.5">
                    <dt className="text-muted-foreground">{t("juz")}</dt>
                    <dd className="font-medium text-foreground/85">
                        <LocalizedNumberList values={juzs} />
                    </dd>
                </div>
                <div className="flex items-baseline gap-1.5">
                    <dt className="text-muted-foreground">{t("hizb")}</dt>
                    <dd className="font-medium text-foreground/85">
                        <LocalizedNumberList values={hizbs} />
                    </dd>
                </div>
                <div className="flex items-baseline gap-1.5">
                    <dt className="text-muted-foreground">{t("rub")}</dt>
                    <dd className="font-medium text-foreground/85">
                        <LocalizedQuarterList values={quarterPositions} />
                    </dd>
                </div>
            </dl>
        </aside>
    );
}
