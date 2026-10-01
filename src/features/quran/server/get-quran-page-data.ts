import "server-only";

import type { PageData } from "../types";
import addTajweed from "./add-tajweed";
import getQuranCorpus from "./get-quran-corpus";

export default async function getQuranPageData(
    number: number,
    edition: string = "quranpedia.mushaf.1",
): Promise<PageData> {
    if (!Number.isInteger(number) || number < 1 || number > 604)
        throw new Error("Invalid Quran page.");
    const corpus = await getQuranCorpus(edition);
    const ayahs = corpus.surahs.flatMap((surah) =>
        surah.ayahs.filter((ayah) => ayah.page === number),
    );
    return {
        number,
        ayahs: await addTajweed(ayahs, edition),
        edition: corpus.edition,
        surahs: Object.fromEntries(
            ayahs.map((ayah) => [ayah.surah.number, ayah.surah]),
        ),
    };
}
