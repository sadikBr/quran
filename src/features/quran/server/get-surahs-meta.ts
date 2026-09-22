import "server-only";

import type { SurahType } from "../types";

export default async function getSurahsMeta(): Promise<SurahType[]> {
    const url = "https://api.alquran.cloud/v1/meta";
    const response = await fetch(url);
    const data = await response.json();
    return data.data.surahs.references;
}
