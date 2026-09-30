import "server-only";
import { parseQuranpediaReciters } from "../helpers/quranpedia-reciters";

export default async function getAvailableReciters() {
    const response = await fetch("https://api.quranpedia.net/v1/reciters", {
        next: { revalidate: 86400 },
    });
    if (!response.ok)
        throw new Error(
            "Unable to load Quranpedia reciters. Please try again.",
        );
    return { reciters: parseQuranpediaReciters(await response.json()) };
}
