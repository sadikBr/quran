"use client";

import { Search, SearchX, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSettings } from "@/features/settings/settings-provider";
import getReadingHref from "../helpers/get-reading-href";
import type { QuranNavigationMeta } from "../navigation-types";
import type { SurahType } from "../types";
import QuranDivisionIndex, {
    type QuranDivisionKind,
} from "./quran-division-index";
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
        var filteredSurahs = [...surahs];

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

    function updateFilter(newFilter: RevelationType) {
        if (revelationTypeFilter === newFilter) {
            setRevelationTypeFilter(undefined);
            return;
        }

        setRevelationTypeFilter(newFilter);
    }

    function clearFilters() {
        setRevelationTypeFilter(undefined);
        setSearchFilter("");
    }

    const sections: IndexSection[] = ["surahs", "juz", "hizb"];

    return (
        <div
            data-quran-scroll-container
            className="mx-auto h-full max-w-5xl overflow-y-auto p-4"
        >
            <div
                role="tablist"
                aria-label={t("index.sectionsLabel")}
                className="mb-7 flex border-b border-border/70"
            >
                {sections.map((section) => (
                    <button
                        key={section}
                        type="button"
                        role="tab"
                        aria-selected={activeSection === section}
                        aria-controls={`${section}-index-panel`}
                        onClick={() => setActiveSection(section)}
                        className={`relative min-w-20 px-4 py-3 text-sm font-semibold outline-none transition-colors after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:min-w-28 ${
                            activeSection === section
                                ? "text-primary after:bg-primary"
                                : "text-muted-foreground after:bg-transparent hover:text-foreground"
                        }`}
                    >
                        {t(`index.${section}Tab`)}
                    </button>
                ))}
            </div>

            {activeSection === "surahs" ? (
                <div
                    id="surahs-index-panel"
                    role="tabpanel"
                    className="outline-none"
                >
                    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="relative w-full max-w-xl">
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
                                onChange={(e) =>
                                    setSearchFilter(e.target.value)
                                }
                                placeholder={t("index.searchPlaceholder")}
                                className="h-11 border-0 bg-muted/55 ps-10 shadow-none placeholder:text-muted-foreground/75 focus-visible:bg-muted/75 focus-visible:ring-1"
                            />
                        </div>
                        <fieldset className="flex self-start rounded-full border-0 bg-muted/55 p-1 sm:self-auto">
                            <legend className="sr-only">
                                {t("index.filterLegend")}
                            </legend>
                            <button
                                type="button"
                                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                                    revelationTypeFilter ===
                                    RevelationType.Meccan
                                        ? "bg-primary text-primary-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                                aria-pressed={
                                    revelationTypeFilter ===
                                    RevelationType.Meccan
                                }
                                onClick={() =>
                                    updateFilter(RevelationType.Meccan)
                                }
                            >
                                {t("index.meccan")}
                            </button>
                            <button
                                type="button"
                                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                                    revelationTypeFilter ===
                                    RevelationType.Medinan
                                        ? "bg-primary text-primary-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                                aria-pressed={
                                    revelationTypeFilter ===
                                    RevelationType.Medinan
                                }
                                onClick={() =>
                                    updateFilter(RevelationType.Medinan)
                                }
                            >
                                {t("index.medinan")}
                            </button>
                        </fieldset>
                    </div>

                    {(revelationTypeFilter !== undefined ||
                        searchFilter !== "") && (
                        <Button
                            onClick={clearFilters}
                            variant="ghost"
                            size="sm"
                            className="-mt-3 mb-4 gap-1.5 px-1 text-muted-foreground hover:bg-transparent hover:text-foreground"
                        >
                            <X aria-hidden="true" className="size-3.5" />
                            {t("index.clearFilters")}
                        </Button>
                    )}

                    {surahsToDisplay.length > 0 ? (
                        surahsToDisplay.map((surah) => (
                            <SurahFrame
                                key={surah.number}
                                surah={surah}
                                href={getReadingHref(
                                    surah.number,
                                    preferences,
                                    surahStartingPages?.[surah.number],
                                )}
                            />
                        ))
                    ) : (
                        <div
                            aria-live="polite"
                            className="mt-6 flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed bg-card/60 px-6 text-center"
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
                        </div>
                    )}
                </div>
            ) : (
                <div
                    id={`${activeSection}-index-panel`}
                    role="tabpanel"
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
