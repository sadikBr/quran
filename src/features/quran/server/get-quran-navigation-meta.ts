import "server-only";

import type { QuranNavigationMeta } from "../navigation-types";
import type { SurahType } from "../types";
import fetchQuranCloud from "./fetch-quran-cloud";

interface BoundaryReference {
    surah: number;
    ayah: number;
}

interface QuranMetaResponse {
    data: {
        surahs: { references: SurahType[] };
        pages: { references: BoundaryReference[] };
        hizbQuarters: { references: BoundaryReference[] };
        juzs: { references: BoundaryReference[] };
    };
}

export default async function getQuranNavigationMeta(): Promise<QuranNavigationMeta> {
    const response = await fetchQuranCloud<QuranMetaResponse>("/meta");
    const { surahs, pages, juzs, hizbQuarters } = response.data;
    const surahOffsets = new Map<number, number>();
    let ayahOffset = 0;

    for (const surah of surahs.references) {
        surahOffsets.set(surah.number, ayahOffset);
        ayahOffset += surah.numberOfAyahs;
    }

    function globalAyahNumber(reference: BoundaryReference) {
        return (surahOffsets.get(reference.surah) ?? 0) + reference.ayah;
    }

    const pageStarts = pages.references.map(globalAyahNumber);

    function pageForAyah(ayahNumber: number) {
        let low = 0;
        let high = pageStarts.length - 1;
        let pageIndex = 0;

        while (low <= high) {
            const middle = Math.floor((low + high) / 2);
            if (pageStarts[middle] <= ayahNumber) {
                pageIndex = middle;
                low = middle + 1;
            } else {
                high = middle - 1;
            }
        }

        return pageIndex + 1;
    }

    function toDivisionReference(reference: BoundaryReference, index: number) {
        const globalNumber = globalAyahNumber(reference);

        return {
            number: index + 1,
            surahNumber: reference.surah,
            ayahNumber: reference.ayah,
            globalAyahNumber: globalNumber,
            pageNumber: pageForAyah(globalNumber),
        };
    }

    return {
        pages: pages.references.map(toDivisionReference),
        juzs: juzs.references.map(toDivisionReference),
        hizbs: hizbQuarters.references
            .filter((_, index) => index % 4 === 0)
            .map(toDivisionReference),
        hizbQuarters: hizbQuarters.references.map(toDivisionReference),
    };
}
