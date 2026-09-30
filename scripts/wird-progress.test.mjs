import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { wirdProgress } from "../src/features/wird/progress";

const group = (anchors) => [
    {
        surah: { number: 2, name: "البقرة", englishName: "Al-Baqara" },
        ayahs: anchors.map((numbers, index) => ({
            number: index + 1,
            numberInSurah: index + 1,
            hafsGlobalNumbers: numbers,
        })),
    },
];
const position = (ayahNumber) => ({
    riwayah: "warsh",
    surahNumber: 2,
    ayahNumber,
});

test("merged Warsh ayah resumes at the next displayed verse", () => {
    const result = wirdProgress(
        group([[8, 9], [10], [11]]),
        9,
        position(1),
        "warsh",
    );
    expect(result.completed).toBe(1);
    expect(result.total).toBe(3);
    expect(result.next.ayah.numberInSurah).toBe(2);
});
test("split Warsh ayahs sharing a Hafs anchor retain distinct positions", () => {
    const groups = group([[8], [8], [9]]);
    expect(
        wirdProgress(groups, 8, position(1), "warsh").next.ayah.numberInSurah,
    ).toBe(2);
    expect(
        wirdProgress(groups, 8, position(2), "warsh").next.ayah.numberInSurah,
    ).toBe(3);
});
test("legacy merged-verse saves advance instead of repeating that verse", () => {
    expect(
        wirdProgress(group([[8, 9], [10]]), 8, null, "warsh").next.ayah
            .numberInSurah,
    ).toBe(2);
});
test("empty, new and fully read portions have correct displayed counts", () => {
    expect(wirdProgress([], null, null, "hafs").total).toBe(0);
    expect(wirdProgress(group([[8], [9]]), null, null, "warsh").completed).toBe(
        0,
    );
    const done = wirdProgress(group([[8], [9]]), 9, position(2), "warsh");
    expect(done.next).toBeNull();
    expect(done.completed).toBe(done.total);
});
test("switching riwayah uses the canonical progress rather than foreign numbering", () => {
    expect(
        wirdProgress(group([[8], [9], [10]]), 9, position(1), "hafs").completed,
    ).toBe(2);
});
test("goal edits do not overwrite current progress, completion or history", () => {
    const source = readFileSync(
        new URL(
            "../src/features/wird/server/update-wird-preference.ts",
            import.meta.url,
        ),
        "utf8",
    );
    expect(source).not.toContain(".delete(");
    const conflict = source.slice(source.indexOf(".onConflictDoUpdate"));
    expect(conflict).toContain("nextGoal: parsed.data");
    expect(conflict).not.toContain("progressGlobalAyah:");
    expect(conflict).not.toContain("completedAt:");
    expect(source).toContain("if (plan) return false");
});
