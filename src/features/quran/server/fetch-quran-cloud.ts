import "server-only";

const QURAN_CLOUD_BASE_URL = "https://api.alquran.cloud/v1";
const QURAN_CLOUD_REVALIDATE_SECONDS = 60 * 60 * 24;

export default async function fetchQuranCloud<T>(path: string): Promise<T> {
    let response: Response;

    try {
        response = await fetch(`${QURAN_CLOUD_BASE_URL}${path}`, {
            next: { revalidate: QURAN_CLOUD_REVALIDATE_SECONDS },
        });
    } catch (error) {
        console.error("Unable to reach Al Quran Cloud.", error);
        throw new Error("Unable to load Quran data. Please try again shortly.");
    }

    if (!response.ok) {
        console.error("Al Quran Cloud returned an error.", {
            path,
            status: response.status,
            statusText: response.statusText,
        });
        throw new Error("Unable to load Quran data. Please try again shortly.");
    }

    try {
        return await response.json();
    } catch (error) {
        console.error("Al Quran Cloud returned invalid JSON.", error);
        throw new Error("Unable to load Quran data. Please try again shortly.");
    }
}
