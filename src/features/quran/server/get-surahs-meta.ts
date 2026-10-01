import "server-only";

import type { SurahType } from "../types";
import getQuranpediaSurahs from "./get-quranpedia-surahs";

export default async function getSurahsMeta(): Promise<SurahType[]> {
    return (await getQuranpediaSurahs()).map((surah) => ({ ...surah }));
}
