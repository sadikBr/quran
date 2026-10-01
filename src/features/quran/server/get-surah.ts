import "server-only";

import getQuranCorpus from "./get-quran-corpus";

export default async function getSurahData(
    number: string,
    edition = "quranpedia.mushaf.1",
) {
    const corpus = await getQuranCorpus(edition);
    const surah = corpus.surahs.find((item) => item.number === Number(number));
    if (!surah) throw new Error("Invalid Quran surah.");
    const { ayahs, ...surahMeta } = surah;
    return {
        ayahs,
        edition: corpus.edition,
        surahMeta,
        audio: undefined,
        audioSecondary: undefined,
    };
}
