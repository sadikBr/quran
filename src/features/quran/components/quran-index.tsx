"use client";

import { SearchX } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SurahType } from "../types";
import SurahFrame from "./surah-frame";

enum RevelationType {
    Meccan,
    Medinan,
}

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

export default function QuranIndex({ surahs }: { surahs: SurahType[] }) {
    const [revelationTypeFilter, setRevelationTypeFilter] =
        useState<RevelationType>();
    const [searchFilter, setSearchFilter] = useState<string>("");

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

    return (
        <div className="mx-auto h-full max-w-5xl overflow-y-auto p-4">
            <div className="flex text-xl font-bold items-end justify-end gap-4 mb-4">
                <div className="flex flex-col gap-2 flex-1">
                    <Label htmlFor="search-filter">Search Filter</Label>
                    <Input
                        id="search-filter"
                        value={searchFilter}
                        onChange={(e) => setSearchFilter(e.target.value)}
                        placeholder="Filter ..."
                    />
                </div>
                <Button
                    variant={
                        revelationTypeFilter === RevelationType.Meccan
                            ? "default"
                            : "outline"
                    }
                    className="px-8 py-4"
                    aria-pressed={
                        revelationTypeFilter === RevelationType.Meccan
                    }
                    onClick={() => updateFilter(RevelationType.Meccan)}
                >
                    مكية
                </Button>
                <Button
                    variant={
                        revelationTypeFilter === RevelationType.Medinan
                            ? "default"
                            : "outline"
                    }
                    className="px-8 py-4"
                    aria-pressed={
                        revelationTypeFilter === RevelationType.Medinan
                    }
                    onClick={() => updateFilter(RevelationType.Medinan)}
                >
                    مدنية
                </Button>
            </div>

            {(revelationTypeFilter !== undefined || searchFilter !== "") && (
                <Button onClick={clearFilters} variant="link" className="my-2">
                    Clear Filter
                </Button>
            )}

            {surahsToDisplay.length > 0 ? (
                surahsToDisplay.map((surah) => (
                    <SurahFrame
                        key={surah.number}
                        surah={surah}
                        activateLink={true}
                    />
                ))
            ) : (
                <div
                    aria-live="polite"
                    className="mt-6 flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed bg-card/60 px-6 text-center"
                >
                    <span className="mb-4 flex size-11 items-center justify-center rounded-full bg-accent text-accent-foreground">
                        <SearchX aria-hidden="true" className="size-5" />
                    </span>
                    <h2 className="text-lg font-semibold">No surahs found</h2>
                    <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                        Try a different search term or clear the active filters.
                    </p>
                </div>
            )}
        </div>
    );
}
