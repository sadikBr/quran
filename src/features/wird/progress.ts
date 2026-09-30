import type { WirdReaderGroup } from "./reader-types";
import type { DailyWird } from "./types";

export function wirdProgress(
    groups: WirdReaderGroup[],
    progress: number | null,
    position: DailyWird["progressVerse"],
    riwayah: "hafs" | "warsh",
) {
    const verses = groups.flatMap((group) =>
        group.ayahs.map((ayah) => ({ ayah, surah: group.surah })),
    );
    let index = -1;
    if (position?.riwayah === riwayah)
        index = verses.findIndex(
            ({ ayah, surah }) =>
                surah.number === position.surahNumber &&
                ayah.numberInSurah === position.ayahNumber,
        );
    if (index < 0 && progress !== null) {
        // Legacy saves identify a read verse by its canonical correspondence.
        index = verses.findIndex(({ ayah }) =>
            (ayah.hafsGlobalNumbers ?? [ayah.number]).includes(progress),
        );
        if (index < 0)
            index = verses.findLastIndex(
                ({ ayah }) =>
                    Math.max(...(ayah.hafsGlobalNumbers ?? [ayah.number])) <=
                    progress,
            );
    }
    return {
        verses,
        completed: index + 1,
        total: verses.length,
        next: verses[index + 1] ?? null,
    };
}
