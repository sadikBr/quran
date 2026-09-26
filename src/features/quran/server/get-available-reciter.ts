import "server-only";
import type { QuranJsonResponse } from "../types";

const QURAN_JSON_BASE_URL = "https://quran-json.risanb.com";
const QURAN_JSON_REVALIDATE_SECONDS = 60 * 60 * 24;
const MP3_QURAN_ARABIC_RECITERS_URL =
    "https://www.mp3quran.net/api/v3/reciters?language=ar";

interface Mp3QuranRecitersResponse {
    reciters: Array<{ id: number; name: string }>;
}

export default async function getAvailableReciters(): Promise<QuranJsonResponse> {
    let response: Response;

    try {
        response = await fetch(`${QURAN_JSON_BASE_URL}/audio/reciters.json`, {
            next: { revalidate: QURAN_JSON_REVALIDATE_SECONDS },
        });
    } catch (error) {
        console.error("Unable to reach Al Quran Json.", error);
        throw new Error(
            "Unable to load Reciters data. Please try again shortly.",
        );
    }

    if (!response.ok) {
        console.error("Al Quran Json returned an error.", {
            status: response.status,
            statusText: response.statusText,
        });
        throw new Error(
            "Unable to load Reciters data. Please try again shortly.",
        );
    }

    let data: QuranJsonResponse;

    try {
        data = await response.json();
    } catch (error) {
        console.error("Al Quran Json returned invalid JSON.", error);
        throw new Error(
            "Unable to load Reciters data. Please try again shortly.",
        );
    }

    try {
        const arabicResponse = await fetch(MP3_QURAN_ARABIC_RECITERS_URL, {
            next: { revalidate: QURAN_JSON_REVALIDATE_SECONDS },
        });

        if (!arabicResponse.ok) return data;

        const arabicData =
            (await arabicResponse.json()) as Mp3QuranRecitersResponse;
        const arabicNames = new Map(
            arabicData.reciters.map((reciter) => [reciter.id, reciter.name]),
        );

        return {
            ...data,
            reciters: data.reciters.map((reciter) => {
                if (reciter.host !== "mp3quran") return reciter;

                const id = Number(reciter.id.match(/^mp3quran\/(\d+)/)?.[1]);
                const arabicName = arabicNames.get(id);

                return arabicName ? { ...reciter, arabicName } : reciter;
            }),
        };
    } catch {
        return data;
    }
}
