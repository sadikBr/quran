import "server-only";

import type { PageData } from "../types";

export default async function getQuranPageData(
    number: number,
    edition: string = "quran-simple",
): Promise<PageData> {
    const url = `https://api.alquran.cloud/v1/page/${number}/${edition}`;
    const response = await fetch(url);
    const data = await response.json();
    return data;
}
