import { expect, test } from "bun:test";
import { z } from "zod";
import * as progress from "../src/features/memorization/progress";
import * as similar from "../src/features/retention/similar";
import { loadTypeScript } from "./helpers/load-typescript.mjs";

function fixture({
    authenticated = true,
    admin = false,
    known = ["a", "b", "c"],
    after,
    unavailable = false,
} = {}) {
    const native = [
        { surahNumber: 1, ayahNumber: 2, atoms: ["a"] },
        { surahNumber: 1, ayahNumber: 3, atoms: ["b", "c"] },
    ];
    let covered = new Set(known);
    let fetches = 0;
    const service = loadTypeScript("src/features/retention/server/similar.ts", {
        "next/headers": { headers: async () => new Headers() },
        zod: { z },
        "@/features/auth/auth": {
            auth: {
                api: {
                    getSession: async () =>
                        authenticated ? { user: { id: "learner" } } : null,
                },
            },
        },
        "@/features/auth/permissions": { isPlatformAdmin: async () => admin },
        "@/features/memorization/progress": progress,
        "@/features/memorization/server/get-memory-catalogue": async () => ({
            hafs: native,
            warsh: native,
        }),
        "@/features/practice/types": {
            quranReferenceSchema: z.object({
                surahNumber: z.number().int().min(1).max(114),
                ayahNumber: z.number().int().positive(),
            }),
        },
        "@/features/quran/server/get-ayah-study": async () => {
            fetches++;
            if (after) covered = new Set(after);
            if (unavailable) throw new Error("Unavailable");
            return {
                section: "similar",
                groups: [{ verses: [{ surah: 1, ayah: 3 }] }],
                sourceUrl: "https://quranpedia.net/",
            };
        },
        "../similar": similar,
        "./state": { retentionState: async () => ({ covered }) },
        "./verses": {
            exerciseVerses: async () =>
                native.map((v, i) => ({
                    ...v,
                    text: i ? "الرَّحْمَٰنِ الرَّحِيمِ" : "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ",
                    surahName: "الفاتحة",
                    englishName: "Al-Fatiha",
                })),
        },
    });
    return {
        load: (input = { riwayah: "warsh", surahNumber: 1, ayahNumber: 2 }) =>
            service.loadSimilarExercise(input),
        fetches: () => fetches,
    };
}

test("similar exercises reject unauthorized, admin, invalid and unknown references before fetching", async () => {
    for (const options of [
        { authenticated: false },
        { admin: true },
        { known: [] },
    ]) {
        const f = fixture(options);
        expect((await f.load()).reason).toBe("unknown");
        expect(f.fetches()).toBe(0);
    }
    const f = fixture();
    expect(
        (await f.load({ riwayah: "warsh", surahNumber: 115, ayahNumber: 2 }))
            .reason,
    ).toBe("unknown");
    expect(f.fetches()).toBe(0);
});

test("similar exercises require the whole native ayah and preserve native text", async () => {
    expect((await fixture({ known: ["a", "b"] }).load()).reason).toBe("empty");
    const result = await fixture().load();
    expect(result.success).toBe(true);
    expect(result.exercise.riwayah).toBe("warsh");
    expect(result.exercise.alternatives.map((v) => v.ayahNumber)).toEqual([3]);
    expect(result.exercise.alternatives[0].text).toBe("الرَّحْمَٰنِ الرَّحِيمِ");
});

test("grid corrections during the external request are respected", async () => {
    expect((await fixture({ after: ["b", "c"] }).load()).reason).toBe(
        "unknown",
    );
    expect((await fixture({ after: ["a", "b"] }).load()).reason).toBe("empty");
});

test("unavailable study content produces a recoverable exercise error", async () => {
    expect((await fixture({ unavailable: true }).load()).reason).toBe(
        "unavailable",
    );
});
