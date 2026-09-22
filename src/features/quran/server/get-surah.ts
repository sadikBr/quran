import "server-only";

import type { AyahType, SurahType } from "../types";

export default async function getSurahData(
    number: string,
    edition: string = "quran-simple",
) {
    const url = `https://api.alquran.cloud/v1/surah/${number}/${edition}`;
    const response = await fetch(url);
    const data = await response.json();

    const ayahs: AyahType[] = data.data.ayahs;
    delete data.data.ayahs;
    delete data.data.edition;
    const surahMeta: SurahType = data.data;

    return { ayahs, surahMeta };
}
