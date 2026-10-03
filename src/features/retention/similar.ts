import {
    isMemorized,
    type MemoryCatalogue,
    type Riwayah,
} from "@/features/memorization/progress";
import type { ExerciseVerse } from "./types";

/** Study references use Hafs numbering; exercises always show the learner's native reading. */
export function memorizedSimilarReferences(
    catalogue: MemoryCatalogue,
    riwayah: Riwayah,
    covered: Set<string>,
    references: { surah: number; ayah: number }[],
    source: { surahNumber: number; ayahNumber: number },
) {
    const related = new Set(
        references.flatMap(
            (ref) =>
                catalogue.hafs.find(
                    (v) =>
                        v.surahNumber === ref.surah &&
                        v.ayahNumber === ref.ayah,
                )?.atoms ?? [],
        ),
    );
    return catalogue[riwayah].filter(
        (v) =>
            !(
                v.surahNumber === source.surahNumber &&
                v.ayahNumber === source.ayahNumber
            ) &&
            isMemorized(v, covered) &&
            v.atoms.some((a) => related.has(a)),
    );
}

const normalizedWord = (word: string) =>
    word.replace(
        /[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed\uFEFFـ۞]/gu,
        "",
    );
export const verseWords = (text: string) =>
    text
        .replace(/\uFEFF/g, "")
        .trim()
        .split(/\s+/u)
        .filter((word) => normalizedWord(word));
export function opening(text: string) {
    const words = verseWords(text);
    return words.slice(0, Math.min(3, Math.max(1, words.length - 1))).join(" ");
}

/** Word-level alignment preserves Quran text exactly; highlighting ignores recitation marks. */
export function differingWords(reference: string, text: string) {
    const a = verseWords(reference),
        b = verseWords(text);
    const matrix = Array.from(
        { length: a.length + 1 },
        () => new Uint16Array(b.length + 1),
    );
    for (let i = a.length - 1; i >= 0; i--)
        for (let j = b.length - 1; j >= 0; j--)
            matrix[i][j] =
                normalizedWord(a[i]) === normalizedWord(b[j])
                    ? 1 + matrix[i + 1][j + 1]
                    : Math.max(matrix[i + 1][j], matrix[i][j + 1]);
    const same = new Set<number>();
    let i = 0,
        j = 0;
    while (i < a.length && j < b.length) {
        if (normalizedWord(a[i]) === normalizedWord(b[j])) {
            same.add(j);
            i++;
            j++;
        } else if (matrix[i + 1][j] >= matrix[i][j + 1]) i++;
        else j++;
    }
    return b.map((word, index) => ({ word, different: !same.has(index) }));
}
export type SimilarExercise = {
    source: ExerciseVerse;
    alternatives: ExerciseVerse[];
    sourceUrl: string;
    riwayah: Riwayah;
};
