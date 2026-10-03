import type { PracticeReaderGroup } from "@/features/practice/reader-types";
import type { PracticeAssignment } from "@/features/practice/types";

/** Keep both weekly readers focused on the ayahs still needing work. */
export function remainingReaderGroups(
    assignment: PracticeAssignment,
    groups: PracticeReaderGroup[],
    remaining: string[],
) {
    const keys = new Set(remaining);
    const filtered = groups
        .map((group) => ({
            ...group,
            ayahs: group.ayahs.filter((ayah) =>
                keys.has(`${group.surah.number}:${ayah.numberInSurah}`),
            ),
        }))
        .filter((group) => group.ayahs.length);
    const last = filtered.at(-1);
    const ayah = last?.ayahs.at(-1);
    if (last && ayah)
        assignment.end = {
            surahNumber: last.surah.number,
            ayahNumber: ayah.numberInSurah,
        };
    return filtered;
}
