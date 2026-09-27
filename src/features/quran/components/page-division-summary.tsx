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
            className="mb-4 flex min-w-0 flex-col items-stretch gap-2 text-[11px] text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-x-3 sm:gap-y-1 sm:text-xs"
        >
            <p className="min-w-0 max-w-full break-words text-center font-semibold leading-relaxed tracking-[0.08em] text-primary sm:flex-1 sm:text-end">
                {surahNames.join(" · ")}
            </p>
            <span
                aria-hidden="true"
                className="hidden text-primary/35 sm:inline"
            >
                •
            </span>
            <dl className="flex w-full flex-wrap items-center justify-center gap-x-3 gap-y-1 sm:w-auto sm:justify-end">
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
