import "server-only";
import type { Edition, EditionData } from "../types";
import fetchQuranCloud from "./fetch-quran-cloud";

export default async function getAvailableQuranEditions(): Promise<Edition[]> {
    const editionResponse = await fetchQuranCloud<EditionData>("/edition");
    return editionResponse.data;
}
