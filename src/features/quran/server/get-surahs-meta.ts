import "server-only";

import type { SurahType } from "../types";
import fetchQuranCloud from "./fetch-quran-cloud";

export default async function getSurahsMeta(): Promise<SurahType[]> {
    const data = await fetchQuranCloud<{
        data: { surahs: { references: SurahType[] } };
    }>("/meta");
    return data.data.surahs.references;
}
