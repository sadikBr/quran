import type { QuranReference } from "@/features/practice/types";
import type { QuranNavigationMeta } from "@/features/quran/navigation-types";
import type { BaselineRange } from "./progress";

export function surahEdgeStarts(
    pool: QuranReference[],
    surahs: { number: number; numberOfAyahs: number }[],
    count: number,
    mode: "opening" | "ending",
) {
    const allowed = new Set(
        pool.map((point) => `${point.surahNumber}:${point.ayahNumber}`),
    );
    return surahs.flatMap((surah) => {
        const length = Math.min(count, surah.numberOfAyahs);
        const start = mode === "opening" ? 1 : surah.numberOfAyahs - length + 1;
        for (let ayah = start; ayah < start + length; ayah++) {
            if (!allowed.has(`${surah.number}:${ayah}`)) return [];
        }
        return [{ surahNumber: surah.number, ayahNumber: start }];
    });
}

export function availableStarts<T extends QuranReference>(
    pool: T[],
    seen: QuranReference[],
    count: number,
    surahs: { number: number; numberOfAyahs: number }[],
) {
    const key = (point: QuranReference) =>
        `${point.surahNumber}:${point.ayahNumber}`;
    const excluded = new Set(seen.map(key));
    const counts = new Map(
        surahs.map((surah) => [surah.number, surah.numberOfAyahs]),
    );
    const full = new Set<string>();
    let remaining = 0;
    for (let index = pool.length - 1; index >= 0; index--) {
        const point = pool[index];
        const next = pool[index + 1];
        const adjacent =
            next &&
            (point.ayahNumber === counts.get(point.surahNumber)
                ? next.surahNumber === point.surahNumber + 1 &&
                  next.ayahNumber === 1
                : next.surahNumber === point.surahNumber &&
                  next.ayahNumber === point.ayahNumber + 1);
        remaining = adjacent ? remaining + 1 : 0;
        if (remaining >= count) full.add(key(point));
    }
    const unseen = pool.filter((point) => !excluded.has(key(point)));
    const preferred = unseen.filter((point) => full.has(key(point)));
    return preferred.length ? preferred : unseen;
}

export function continuationReferences(
    pool: QuranReference[],
    start: QuranReference,
    count: number,
    surahs: { number: number; numberOfAyahs: number }[],
    spanSurahs = true,
) {
    const index = pool.findIndex(
        (point) =>
            point.surahNumber === start.surahNumber &&
            point.ayahNumber === start.ayahNumber,
    );
    if (index < 0) return [];
    const selected = [pool[index]];
    for (const next of pool.slice(index + 1, index + count + 1)) {
        if (!spanSurahs && next.surahNumber !== start.surahNumber) break;
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
    memorizedRanges?: BaselineRange[],
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
                    : memorizedRanges
                      ? memorizedRanges.some(
                            (r) =>
                                r.surahNumber === point.surahNumber &&
                                point.ayahNumber >= r.startAyahNumber &&
                                point.ayahNumber <= r.endAyahNumber,
                        )
                      : marked.has(point.hizb)
            )
                pool.push(point);
        }
    }
    return pool;
}
