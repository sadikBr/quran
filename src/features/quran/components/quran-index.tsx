"use client";

import { BookOpen, Search, SearchX, X } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import PageHeading from "@/components/page-heading";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSettings } from "@/features/settings/settings-provider";
import getReadingHref from "../helpers/get-reading-href";
import type { QuranNavigationMeta } from "../navigation-types";
import type { SurahType } from "../types";
import QuranDivisionIndex, {
    type QuranDivisionKind,
} from "./quran-division-index";
import QuranPageJump from "./quran-page-jump";
import SurahFrame from "./surah-frame";

enum RevelationType {
    Meccan,
    Medinan,
}

type IndexSection = "surahs" | QuranDivisionKind;

function normalizeForSearch(value: string) {
    return value
        .toLowerCase()
        .replace(/[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed\u0640]/g, "")
        .replace(/[أإآٱ]/g, "ا")
        .replace(/ى/g, "ي")
        .replace(/ؤ/g, "و")
        .replace(/ئ/g, "ي")
        .replace(/-/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

export default function QuranIndex({
    surahs,
    navigation,
    surahStartingPages,
}: {
    surahs: SurahType[];
    navigation: QuranNavigationMeta;
    surahStartingPages?: Record<number, number>;
}) {
    const t = useTranslations("Reader");
    const [activeSection, setActiveSection] = useState<IndexSection>("surahs");
    const [revelationTypeFilter, setRevelationTypeFilter] =
        useState<RevelationType>();
    const [searchFilter, setSearchFilter] = useState<string>("");
    const preferences = useSettings();

    const surahsToDisplay = useMemo(() => {
        let filteredSurahs = [...surahs];

        if (revelationTypeFilter !== undefined) {
            const filterString =
                revelationTypeFilter === RevelationType.Meccan
                    ? "Meccan"
                    : "Medinan";
            filteredSurahs = filteredSurahs.filter(
                (surah) => surah.revelationType === filterString,
            );
        }

        if (searchFilter !== "") {
            filteredSurahs = filteredSurahs.filter(
                (surah) =>
                    String(surah.number) ===
                        searchFilter
                            .trim()
                            .replace(/[٠-٩]/g, (digit) =>
                                String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)),
                            ) ||
                    normalizeForSearch(surah.name).includes(
                        normalizeForSearch(searchFilter),
                    ) ||
                    normalizeForSearch(surah.englishName).includes(
                        normalizeForSearch(searchFilter),
                    ) ||
                    normalizeForSearch(surah.englishNameTranslation).includes(
                        normalizeForSearch(searchFilter),
                    ),
            );
        }

        return filteredSurahs;
    }, [revelationTypeFilter, searchFilter, surahs]);

    const sections: IndexSection[] = ["surahs", "juz", "hizb"];
    const revelationFilters = [
        { key: "all", value: undefined, label: t("index.all") },
        {
            key: "meccan",
            value: RevelationType.Meccan,
            label: t("index.meccan"),
        },
        {
            key: "medinan",
            value: RevelationType.Medinan,
            label: t("index.medinan"),
        },
    ] as const;

    return (
        <div
            data-quran-scroll-container
            className="app-container h-full overflow-y-auto pb-12 pt-5 sm:pt-8"
        >
            <PageHeading
                className="mb-6"
                title={t("index.title")}
                description={t("index.description")}
                icon={<BookOpen />}
            />
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <QuranPageJump maxPage={navigation.pages.length} />
                <Link
                    href="/quran/search"
                    className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary hover:underline underline-offset-4"
                >
                    <Search aria-hidden="true" className="size-4" />
                    {t("search.title")}
                </Link>
            </div>
            <div className="mb-6 app-card p-3 sm:p-4">
                <div
                    role="tablist"
                    aria-label={t("index.sectionsLabel")}
                    className={`grid grid-cols-3 ${activeSection === "surahs" ? "border-b border-border/60" : ""}`}
                >
                    {sections.map((section) => (
                        <button
                            key={section}
                            type="button"
                            role="tab"
                            id={`${section}-index-tab`}
                            tabIndex={activeSection === section ? 0 : -1}
                            aria-selected={activeSection === section}
                            aria-controls={`${section}-index-panel`}
                            onClick={() => setActiveSection(section)}
                            onKeyDown={(event) => {
                                const current = sections.indexOf(section);
                                const direction =
                                    preferences.language === "ar" ? -1 : 1;
                                let next = current;
                                if (event.key === "ArrowRight")
                                    next =
                                        (current +
                                            direction +
                                            sections.length) %
                                        sections.length;
                                else if (event.key === "ArrowLeft")
                                    next =
                                        (current -
                                            direction +
                                            sections.length) %
                                        sections.length;
                                else if (event.key === "Home") next = 0;
                                else if (event.key === "End")
                                    next = sections.length - 1;
                                else return;
                                event.preventDefault();
                                setActiveSection(sections[next]);
                                document
                                    .getElementById(
                                        `${sections[next]}-index-tab`,
                                    )
                                    ?.focus();
                            }}
                            className={`relative min-w-0 px-2 py-3.5 text-sm font-semibold outline-none transition-colors after:absolute after:inset-x-[22%] after:-bottom-px after:h-0.5 after:origin-center after:rounded-full after:bg-primary after:transition-transform focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-4 sm:py-4 ${
                                activeSection === section
                                    ? "text-primary after:scale-x-100"
                                    : "text-muted-foreground after:scale-x-0 hover:text-foreground"
                            }`}
                        >
                            {t(`index.${section}Tab`)}
                        </button>
                    ))}
                </div>

                {activeSection === "surahs" && (
                    <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-8">
                        <div className="relative min-w-0 flex-1">
                            <Label htmlFor="search-filter" className="sr-only">
                                {t("index.searchLabel")}
                            </Label>
                            <Search
                                aria-hidden="true"
                                className="pointer-events-none absolute top-1/2 start-3.5 size-4 -translate-y-1/2 text-muted-foreground"
                            />
                            <Input
                                id="search-filter"
                                value={searchFilter}
                                onChange={(event) =>
                                    setSearchFilter(event.target.value)
                                }
                                placeholder={t("index.searchPlaceholder")}
                                className="h-12 rounded-xl border-border/70 bg-background ps-10 pe-10 text-start shadow-none placeholder:text-muted-foreground/70"
                            />
                            {searchFilter !== "" && (
                                <button
                                    type="button"
                                    onClick={() => setSearchFilter("")}
                                    aria-label={t("index.clearSearch")}
                                    className="absolute top-1/2 end-1 flex size-10 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    <X aria-hidden="true" className="size-4" />
                                </button>
                            )}
                        </div>

                        <fieldset className="flex shrink-0 items-center justify-center gap-1 self-center sm:self-auto">
                            <legend className="sr-only">
                                {t("index.filterLegend")}
                            </legend>
                            {revelationFilters.map((filter) => {
                                const isActive =
                                    revelationTypeFilter === filter.value;

                                return (
                                    <button
                                        key={filter.key}
                                        type="button"
                                        className={`relative min-h-11 min-w-16 px-3 py-2 text-sm font-medium transition-colors after:absolute after:bottom-0 after:left-1/2 after:size-1 after:-translate-x-1/2 after:rounded-full after:bg-primary after:transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                                            isActive
                                                ? "text-primary after:scale-100"
                                                : "text-muted-foreground after:scale-0 hover:text-foreground"
                                        }`}
                                        aria-pressed={isActive}
                                        onClick={() =>
                                            setRevelationTypeFilter(
                                                filter.value,
                                            )
                                        }
                                    >
                                        {filter.label}
                                    </button>
                                );
                            })}
                        </fieldset>
                    </div>
                )}
            </div>

            {activeSection === "surahs" && (
                <output className="mb-3 block text-xs text-muted-foreground">
                    {t("index.resultCount", {
                        count: surahsToDisplay.length,
                        total: surahs.length,
                    })}
                </output>
            )}
            {activeSection === "surahs" ? (
                <div
                    id="surahs-index-panel"
                    role="tabpanel"
                    aria-labelledby="surahs-index-tab"
                    className="grid gap-3 outline-none md:grid-cols-2"
                >
                    {surahsToDisplay.length > 0 ? (
                        surahsToDisplay.map((surah) => (
                            <SurahFrame
                                key={surah.number}
                                surah={surah}
                                compact
                                href={getReadingHref(
                                    surah.number,
                                    preferences,
                                    surahStartingPages?.[surah.number] ??
                                        surah.startingPage,
                                )}
                            />
                        ))
                    ) : (
                        <div
                            aria-live="polite"
                            className="col-span-full flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed bg-card/60 px-6 text-center"
                        >
                            <span className="mb-4 flex size-11 items-center justify-center rounded-full bg-accent text-accent-foreground">
                                <SearchX
                                    aria-hidden="true"
                                    className="size-5"
                                />
                            </span>
                            <h2 className="text-lg font-semibold">
                                {t("index.noResultsTitle")}
                            </h2>
                            <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                                {t("index.noResultsDescription")}
                            </p>
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchFilter("");
                                    setRevelationTypeFilter(undefined);
                                }}
                                className="mt-4 min-h-11 rounded-xl border px-4 text-sm font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                {t("index.clearFilters")}
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <div
                    id={`${activeSection}-index-panel`}
                    role="tabpanel"
                    aria-labelledby={`${activeSection}-index-tab`}
                    className="outline-none"
                >
                    <QuranDivisionIndex
                        kind={activeSection}
                        references={navigation[`${activeSection}s`]}
                        surahs={surahs}
                        readingMode={preferences.readingMode}
                    />
                </div>
            )}
        </div>
    );
}
