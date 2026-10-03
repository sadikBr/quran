import type { QuranReference } from "@/features/practice/types";

export type Riwayah = "hafs" | "warsh";
export type MemoryVerse = QuranReference & {
    hizb: number;
    quarter: number;
    atoms: string[];
    page: number;
};
export type MemoryCatalogue = Record<Riwayah, MemoryVerse[]>;
export type Assessment = {
    id: string;
    riwayah: Riwayah;
    method: "self" | "peer";
    outcome: "confirmed" | "needs_revision";
    startSurahNumber: number;
    startAyahNumber: number;
    endSurahNumber: number;
    endAyahNumber: number;
    createdAt: Date;
};
export const CORRECTION_WINDOW_MS = 3 * 60 * 60 * 1000;
export function initialCorrectionAvailable(
    setupAt: Date | null,
    usedAt: Date | null,
    now: Date,
) {
    return Boolean(
        setupAt &&
            !usedAt &&
            now.getTime() < setupAt.getTime() + CORRECTION_WINDOW_MS,
    );
}
export function assessmentVerses(
    catalogue: MemoryCatalogue,
    assessment: Omit<Assessment, "id" | "method" | "outcome" | "createdAt">,
) {
    const verses = catalogue[assessment.riwayah];
    const start = verses.findIndex(
        (v) =>
            v.surahNumber === assessment.startSurahNumber &&
            v.ayahNumber === assessment.startAyahNumber,
    );
    const end = verses.findIndex(
        (v) =>
            v.surahNumber === assessment.endSurahNumber &&
            v.ayahNumber === assessment.endAyahNumber,
    );
    if (start < 0 || end < start)
        throw new Error("Invalid memorization range.");
    return verses.slice(start, end + 1);
}

/** Coverage uses shared verse segments, so a split Warsh ayah cannot complete a whole Hafs ayah. */
export function calculateMemorization(
    catalogue: MemoryCatalogue,
    riwayah: Riwayah,
    baselineRiwayah: Riwayah,
    baseline: number[],
    assessments: Assessment[],
) {
    const initial = new Set(
        catalogue[baselineRiwayah]
            .filter((v) => baseline.includes(v.hizb))
            .flatMap((v) => v.atoms),
    );
    const self = new Set<string>();
    const peer = new Set<string>();
    const revision = new Set<string>();
    const history = new Map<string, Set<string>>();
    for (const assessment of [...assessments].sort(
        (a, b) =>
            a.createdAt.getTime() - b.createdAt.getTime() ||
            a.id.localeCompare(b.id),
    )) {
        const atoms = new Set(
            assessmentVerses(catalogue, assessment).flatMap((v) => v.atoms),
        );
        history.set(assessment.id, atoms);
        for (const atom of atoms) {
            if (assessment.outcome === "needs_revision") revision.add(atom);
            else {
                (assessment.method === "peer" ? peer : self).add(atom);
                revision.delete(atom);
            }
        }
    }
    return Array.from({ length: 60 }, (_, index) => {
        const number = index + 1;
        const verses = catalogue[riwayah].filter((v) => v.hizb === number);
        const atoms = new Set(verses.flatMap((v) => v.atoms));
        const covered = (verse: MemoryVerse) =>
            verse.atoms.every(
                (atom) => initial.has(atom) || self.has(atom) || peer.has(atom),
            );
        const completed = verses.filter(covered).length;
        return {
            number,
            total: verses.length,
            completed,
            percent: verses.length
                ? Math.floor((completed / verses.length) * 100)
                : 0,
            baseline: verses.filter((v) => v.atoms.every((a) => initial.has(a)))
                .length,
            self: verses.filter((v) => v.atoms.every((a) => self.has(a)))
                .length,
            peer: verses.filter((v) => v.atoms.every((a) => peer.has(a)))
                .length,
            needsRevision: [...atoms].some((a) => revision.has(a)),
            historyIds: [...history]
                .filter(([, a]) => [...a].some((v) => atoms.has(v)))
                .map(([id]) => id),
            start: verses[0]
                ? {
                      surahNumber: verses[0].surahNumber,
                      ayahNumber: verses[0].ayahNumber,
                      page: verses[0].page,
                  }
                : null,
        };
    });
}
export type HizbProgress = ReturnType<typeof calculateMemorization>[number];

export function memorizedAtoms(
    catalogue: MemoryCatalogue,
    baselineRiwayah: Riwayah,
    baseline: number[],
    assessments: Assessment[],
) {
    const atoms = new Set(
        catalogue[baselineRiwayah]
            .filter((v) => baseline.includes(v.hizb))
            .flatMap((v) => v.atoms),
    );
    for (const a of assessments.filter((a) => a.outcome === "confirmed"))
        for (const v of assessmentVerses(catalogue, a))
            for (const atom of v.atoms) atoms.add(atom);
    return atoms;
}
export function isMemorized(verse: MemoryVerse, atoms: Set<string>) {
    return verse.atoms.every((a) => atoms.has(a));
}
