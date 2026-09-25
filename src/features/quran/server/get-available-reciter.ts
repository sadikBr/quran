import "server-only";
import type { QuranJsonResponse } from "../types";

const QURAN_JSON_BASE_URL = "https://quran-json.risanb.com";
const QURAN_JSON_REVALIDATE_SECONDS = 60 * 60 * 24;

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

    try {
        return await response.json();
    } catch (error) {
        console.error("Al Quran Json returned invalid JSON.", error);
        throw new Error(
            "Unable to load Reciters data. Please try again shortly.",
        );
    }
}
