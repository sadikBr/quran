import type { QuranReference } from "@/features/practice/types";
import type { QuranNavigationMeta } from "@/features/quran/navigation-types";

export function continuationReferences(
    pool: QuranReference[],
    start: QuranReference,
    count: number,
    surahs: { number: number; numberOfAyahs: number }[],
) {
    const index = pool.findIndex(
        (point) =>
            point.surahNumber === start.surahNumber &&
            point.ayahNumber === start.ayahNumber,
    );
    if (index < 0) return [];
    const selected = [pool[index]];
    for (const next of pool.slice(index + 1, index + count + 1)) {
        const previous = selected[selected.length - 1];
        const lastAyah = surahs.find(
            (surah) => surah.number === previous.surahNumber,
        )?.numberOfAyahs;
        const adjacent =
            previous.ayahNumber === lastAyah
                ? next.surahNumber === previous.surahNumber + 1 &&
                  next.ayahNumber === 1
                : next.surahNumber === previous.surahNumber &&
                  next.ayahNumber === previous.ayahNumber + 1;
        if (!adjacent) break;
        selected.push(next);
    }
    return selected;
}

export function randomStartPool(
    surahs: { number: number; numberOfAyahs: number }[],
    navigation: QuranNavigationMeta,
    completed: number[],
    range?: { start: QuranReference; end: QuranReference },
) {
    const pool: { surahNumber: number; ayahNumber: number; hizb: number }[] =
        [];
    const marked = new Set(completed);
    const order = (point: QuranReference) =>
        point.surahNumber * 1000 + point.ayahNumber;
    // Provider global IDs (notably Warsh) are not necessarily a one-based
    // verse count. Compare the actual surah/ayah boundaries instead.
    const hizbs = [...navigation.hizbs].sort((a, b) => order(a) - order(b));
    let division = 0;
    for (const surah of surahs) {
        for (let ayah = 1; ayah <= surah.numberOfAyahs; ayah++) {
            while (
                division + 1 < hizbs.length &&
                order(hizbs[division + 1]) <=
                    order({ surahNumber: surah.number, ayahNumber: ayah })
            )
                division++;
            const point = {
                surahNumber: surah.number,
                ayahNumber: ayah,
                hizb: hizbs[division]?.number ?? 0,
            };
            if (
                range
                    ? order(point) >= order(range.start) &&
                      order(point) <= order(range.end)
                    : marked.has(point.hizb)
            )
                pool.push(point);
        }
    }
    return pool;
}
