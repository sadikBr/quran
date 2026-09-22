"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { SurahType } from "../types";
import SurahFrame from "./surah-frame";

enum RevelationFilter {
    Meccan,
    Medinan,
}

export default function QuranIndex({ surahs }: { surahs: SurahType[] }) {
    const [filter, setFilter] = useState<RevelationFilter>();

    const surahsToDisplay = useMemo(() => {
        if (filter !== undefined) {
            const filterString =
                filter === RevelationFilter.Meccan ? "Meccan" : "Medinan";
            return surahs.filter(
                (surah) => surah.revelationType === filterString,
            );
        }
        return surahs;
    }, [filter, surahs]);

    function updateFilter(newFilter: RevelationFilter) {
        if (filter === newFilter) {
            setFilter(undefined);
            return;
        }

        setFilter(newFilter);
    }

    return (
        <div className="mx-auto h-full max-w-5xl overflow-y-auto p-4">
            <div className="flex text-xl font-bold items-center justify-end gap-4 mb-4">
                <Button
                    variant={
                        filter === RevelationFilter.Meccan
                            ? "default"
                            : "outline"
                    }
                    className="px-8 py-4"
                    aria-pressed={filter === RevelationFilter.Meccan}
                    onClick={() => updateFilter(RevelationFilter.Meccan)}
                >
                    مكية
                </Button>
                <Button
                    variant={
                        filter === RevelationFilter.Medinan
                            ? "default"
                            : "outline"
                    }
                    className="px-8 py-4"
                    aria-pressed={filter === RevelationFilter.Medinan}
                    onClick={() => updateFilter(RevelationFilter.Medinan)}
                >
                    مدنية
                </Button>
            </div>

            {filter !== undefined && (
                <Button
                    onClick={() => setFilter(undefined)}
                    variant="link"
                    className="my-2"
                >
                    Clear Filter
                </Button>
            )}

            {surahsToDisplay.map((surah) => (
                <SurahFrame key={surah.number} surah={surah} />
            ))}
        </div>
    );
}
