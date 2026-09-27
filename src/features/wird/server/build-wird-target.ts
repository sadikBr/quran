import type { QuranNavigationMeta } from "@/features/quran/navigation-types";
import type { SurahType } from "@/features/quran/types";
import type { WirdUnit } from "../types";

export const TOTAL_QURAN_AYAHS = 6236;

interface WirdTarget {
    startGlobalAyah: number;
    endGlobalAyah: number;
}

function containingBoundaryIndex(
    boundaries: { globalAyahNumber: number }[],
    globalAyahNumber: number,
) {
    let result = 0;

    for (let index = 0; index < boundaries.length; index += 1) {
        if (boundaries[index].globalAyahNumber > globalAyahNumber) break;
        result = index;
    }

    return result;
}

function boundaryTarget(
    boundaries: { globalAyahNumber: number }[],
    amount: number,
    cursor: number,
): WirdTarget {
    const startIndex = containingBoundaryIndex(boundaries, cursor);
    const endBoundary = boundaries[startIndex + amount];

    return {
        startGlobalAyah: boundaries[startIndex].globalAyahNumber,
        endGlobalAyah: Math.min(
            (endBoundary?.globalAyahNumber ?? TOTAL_QURAN_AYAHS + 1) - 1,
            TOTAL_QURAN_AYAHS,
        ),
    };
}

function surahBoundaries(surahs: SurahType[]) {
    let offset = 0;

    return surahs.map((surah) => {
        const boundary = { globalAyahNumber: offset + 1 };
        offset += surah.numberOfAyahs;
        return boundary;
    });
}

export default function buildWirdTarget(
    unit: WirdUnit,
    amount: number,
    cursor: number,
    navigation: QuranNavigationMeta,
    surahs: SurahType[],
): WirdTarget {
    const safeCursor = cursor > TOTAL_QURAN_AYAHS || cursor < 1 ? 1 : cursor;

    if (unit === "ayah") {
        return {
            startGlobalAyah: safeCursor,
            endGlobalAyah: Math.min(safeCursor + amount - 1, TOTAL_QURAN_AYAHS),
        };
    }

    if (unit === "surah") {
        return boundaryTarget(surahBoundaries(surahs), amount, safeCursor);
    }

    return boundaryTarget(
        unit === "hizb" ? navigation.hizbs : navigation.hizbQuarters,
        amount,
        safeCursor,
    );
}
