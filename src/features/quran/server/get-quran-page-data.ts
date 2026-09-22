import "server-only";

import type { PageData } from "../types";
import fetchQuranCloud from "./fetch-quran-cloud";

export default async function getQuranPageData(
    number: number,
    edition: string = "quran-simple",
): Promise<PageData> {
    return fetchQuranCloud<PageData>(`/page/${number}/${edition}`);
}
