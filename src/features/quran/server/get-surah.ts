import "server-only";

import type { AyahType, Edition, SurahType } from "../types";
import fetchQuranCloud from "./fetch-quran-cloud";

export default async function getSurahData(
    number: string,
    edition: string = "quran-simple",
) {
    const data = await fetchQuranCloud<{
        data: SurahType & {
            ayahs: AyahType[];
            edition: Edition;
            audio?: string;
            audioSecondary?: string[];
        };
    }>(`/surah/${number}/${edition}`);

    const {
        ayahs,
        edition: editionData,
        audio,
        audioSecondary,
        ...surahMeta
    } = data.data;

    return { ayahs, edition: editionData, surahMeta, audio, audioSecondary };
}
