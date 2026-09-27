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

    // The full-surah endpoint omits the nested `surah` object that is present
    // on page responses. Keep the app's AyahType contract consistent so
    // shared reader/audio code can safely use the same shape in both modes.
    const normalizedAyahs = ayahs.map((ayah) => ({
        ...ayah,
        surah: ayah.surah ?? surahMeta,
    }));

    return {
        ayahs: normalizedAyahs,
        edition: editionData,
        surahMeta,
        audio,
        audioSecondary,
    };
}
