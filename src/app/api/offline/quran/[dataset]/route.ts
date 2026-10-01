import { NextResponse } from "next/server";
import {
    OFFLINE_QURAN_VERSION,
    type OfflineQuranDataset,
} from "@/features/offline/types";
import type { QuranCorpus } from "@/features/quran/helpers/quranpedia-data";
import getQuranCorpus from "@/features/quran/server/get-quran-corpus";
import getWarshMushaf from "@/features/quran/server/get-warsh-mushaf";
import type { WarshMushaf } from "@/features/quran/types";

export const runtime = "nodejs";
export const revalidate = 86400;

function compactHafsDataset(
    response: QuranCorpus,
    kind: "hafs" | "translation",
    edition: string,
): OfflineQuranDataset {
    return {
        version: OFFLINE_QURAN_VERSION,
        kind,
        edition,
        surahs: response.surahs.map((surah) => ({
            number: surah.number,
            name: surah.name,
            englishName: surah.englishName,
            englishNameTranslation: surah.englishNameTranslation,
            revelationType: surah.revelationType,
            ayahs: surah.ayahs.map((ayah) => ({
                number: ayah.numberInSurah,
                globalNumber: ayah.number,
                text: ayah.text,
                page: ayah.page,
                juz: ayah.juz,
                hizbQuarter: ayah.hizbQuarter,
                sajda: Boolean(ayah.sajda),
            })),
        })),
    };
}

function compactWarshDataset(mushaf: WarshMushaf): OfflineQuranDataset {
    return {
        version: OFFLINE_QURAN_VERSION,
        kind: "warsh",
        edition: "quranpedia.mushaf.4",
        surahs: mushaf.surahs.map((surah) => ({
            number: surah.id,
            name: surah.name,
            englishName: `Surah ${surah.id}`,
            ayahs: surah.ayahs.map((ayah) => ({
                number: ayah.number,
                globalNumber: ayah.id,
                text: ayah.text,
                page: ayah.page_number,
                juz: ayah.juz,
                hizbQuarter: ayah.hizb,
            })),
        })),
    };
}

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ dataset: string }> },
) {
    const { dataset } = await params;

    let payload: OfflineQuranDataset;
    if (dataset === "hafs") {
        const data = await getQuranCorpus("quranpedia.mushaf.1");
        payload = compactHafsDataset(data, "hafs", "quranpedia.mushaf.1");
    } else if (dataset === "translation") {
        const data = await getQuranCorpus("quranpedia.translation.13638");
        payload = compactHafsDataset(
            data,
            "translation",
            "quranpedia.translation.13638",
        );
    } else if (dataset === "warsh") {
        payload = compactWarshDataset(await getWarshMushaf());
    } else {
        return NextResponse.json(
            { error: "Unknown Quran dataset." },
            { status: 404 },
        );
    }

    return NextResponse.json(payload, {
        headers: {
            "Cache-Control":
                "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
            "X-Quran-Offline-Version": OFFLINE_QURAN_VERSION,
        },
    });
}
