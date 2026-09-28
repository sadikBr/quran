import { NextResponse } from "next/server";
import {
    OFFLINE_QURAN_VERSION,
    type OfflineQuranDataset,
} from "@/features/offline/types";
import fetchQuranCloud from "@/features/quran/server/fetch-quran-cloud";
import getWarshMushaf from "@/features/quran/server/get-warsh-mushaf";
import type { AyahType, SurahType, WarshMushaf } from "@/features/quran/types";

export const runtime = "nodejs";
export const revalidate = 86400;

type QuranCloudResponse = {
    data: {
        surahs: Array<
            SurahType & {
                ayahs: AyahType[];
            }
        >;
    };
};

function compactCloudDataset(
    response: QuranCloudResponse,
    kind: "hafs" | "translation",
    edition: string,
): OfflineQuranDataset {
    return {
        version: OFFLINE_QURAN_VERSION,
        kind,
        edition,
        surahs: response.data.surahs.map((surah) => ({
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
        edition: "warsh-an-nafi",
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
        const data = await fetchQuranCloud<QuranCloudResponse>(
            "/quran/quran-simple",
        );
        payload = compactCloudDataset(data, "hafs", "quran-simple");
    } else if (dataset === "translation") {
        const data =
            await fetchQuranCloud<QuranCloudResponse>("/quran/en.sahih");
        payload = compactCloudDataset(data, "translation", "en.sahih");
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
