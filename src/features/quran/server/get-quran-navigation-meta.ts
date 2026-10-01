import "server-only";

import type { QuranNavigationMeta } from "../navigation-types";
import type { AyahType } from "../types";
import getQuranCorpus from "./get-quran-corpus";

export default async function getQuranNavigationMeta(): Promise<QuranNavigationMeta> {
    const { surahs } = await getQuranCorpus();
    const ayahs = surahs.flatMap((surah) => surah.ayahs);
    function boundaries(value: (ayah: AyahType) => number) {
        const seen = new Set<number>();
        return ayahs.flatMap((ayah) => {
            const number = value(ayah);
            if (seen.has(number)) return [];
            seen.add(number);
            return [
                {
                    number,
                    surahNumber: ayah.surah.number,
                    ayahNumber: ayah.numberInSurah,
                    globalAyahNumber: ayah.number,
                    pageNumber: ayah.page,
                },
            ];
        });
    }
    return {
        pages: boundaries((a) => a.page),
        juzs: boundaries((a) => a.juz),
        hizbs: boundaries((a) => Math.ceil(a.hizbQuarter / 4)),
        hizbQuarters: boundaries((a) => a.hizbQuarter),
    };
}
