import "server-only";

import type { WarshChapter } from "../types";

const QURAN_JSON_BASE_URL = "https://quran-json.risanb.com";
const QURAN_JSON_REVALIDATE_SECONDS = 60 * 60 * 24;

export default async function getWarshChapter(
    surahNumber: number,
): Promise<WarshChapter> {
    let response: Response;

    try {
        response = await fetch(
            `${QURAN_JSON_BASE_URL}/text/warsh/chapters/${surahNumber}.json`,
            { next: { revalidate: QURAN_JSON_REVALIDATE_SECONDS } },
        );
    } catch (error) {
        console.error("Unable to reach Al Quran Json for Warsh text.", error);
        throw new Error("Unable to load the Warsh Quran text right now.");
    }

    if (!response.ok) {
        console.error("Al Quran Json returned a Warsh text error.", {
            surahNumber,
            status: response.status,
            statusText: response.statusText,
        });
        throw new Error("Unable to load the Warsh Quran text right now.");
    }

    try {
        return await response.json();
    } catch (error) {
        console.error("Al Quran Json returned invalid Warsh JSON.", error);
        throw new Error("Unable to load the Warsh Quran text right now.");
    }
}
