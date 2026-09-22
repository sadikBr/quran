import "server-only";

import type { AyahType, SurahType } from "../types";
import fetchQuranCloud from "./fetch-quran-cloud";

export default async function getSurahData(
    number: string,
    edition: string = "quran-simple",
) {
    const data = await fetchQuranCloud<{
        data: SurahType & { ayahs: AyahType[]; edition: unknown };
    }>(`/surah/${number}/${edition}`);

    const { ayahs, edition: _edition, ...surahMeta } = data.data;

    return { ayahs, surahMeta };
}
