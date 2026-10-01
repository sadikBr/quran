import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { safeReturnTo } from "../src/features/auth/return-to";
import { catalogSelectionChanged } from "../src/features/settings/catalog-selection";
import { DEFAULT_PREFERENCES } from "../src/features/settings/preferences";
import { wirdCompletionSchema } from "../src/features/wird/completion";

const source = (path) => readFileSync(`src/${path}`, "utf8");

test("sign-in keeps local destinations and their query strings", () => {
    for (const path of [
        "/settings",
        "/practice/abc/read",
        "/assignments?view=manage&group=abc",
        "/quran/2#ayah-8",
    ])
        expect(safeReturnTo(path)).toBe(path);
});
test("sign-in rejects external destinations and authentication loops", () => {
    for (const path of [
        null,
        "",
        "https://evil.example",
        "//evil.example",
        "/\\evil.example",
        "/sign-in?returnTo=/sign-in",
        "/sign-up",
        "/\nevil.example",
        "javascript:alert(1)",
    ])
        expect(safeReturnTo(path)).toBe("/dashboard");
});
test("appearance and device changes need no catalog validation", () => {
    expect(
        catalogSelectionChanged(DEFAULT_PREFERENCES, {
            ...DEFAULT_PREFERENCES,
            theme: "dark",
            vibration: "strong",
            keepScreenAwake: true,
            language: "ar",
            arabicTextSize: 5,
        }),
    ).toBe(false);
    expect(
        catalogSelectionChanged(DEFAULT_PREFERENCES, {
            ...DEFAULT_PREFERENCES,
        }),
    ).toBe(false);
});
test("every catalog-dependent selection is revalidated when changed", () => {
    for (const [key, value] of Object.entries({
        riwayah: "warsh",
        readingMode: "surah",
        reciter: "quranpedia/263",
        arabicEdition: "other",
        translationEdition: "other",
        tafsirEdition: "other",
    }))
        expect(
            catalogSelectionChanged(DEFAULT_PREFERENCES, {
                ...DEFAULT_PREFERENCES,
                [key]: value,
            }),
        ).toBe(true);
});
test("completion requires the displayed portion identity and revision", () => {
    const portion = {
        targetDate: "2026-09-30",
        start: 8,
        end: 20,
        revision: "2026-09-30 12:00:00.123456+00",
    };
    expect(wirdCompletionSchema.safeParse(portion).success).toBe(true);
    for (const invalid of [
        undefined,
        {},
        { ...portion, revision: "" },
        { ...portion, start: 30 },
        { ...portion, end: 6237 },
    ])
        expect(wirdCompletionSchema.safeParse(invalid).success).toBe(false);
    const action = source("features/wird/server/complete-daily-wird.ts");
    for (const guard of [
        "expected.targetDate",
        "expected.start",
        "expected.end",
        "expected.revision",
        '.for("update")',
    ])
        expect(action).toContain(guard);
});
test("database failures are not converted into empty wird setup", () => {
    const loader = source("features/wird/server/get-daily-wird.ts");
    expect(loader).not.toMatch(/catch\s*\{\s*return null/);
    expect(loader).toContain("if (!record) return null");
});
test("practice mutations are serialized and always release busy state", () => {
    const reader = source("features/practice/components/practice-reader.tsx");
    expect(
        reader.match(/if \(mutationInFlight.current[^\n]*return/g),
    ).toHaveLength(4);
    expect(reader.match(/mutationInFlight.current = false/g)).toHaveLength(4);
    expect(reader.match(/finally/g)).toHaveLength(4);
    expect(reader).toContain("isSubmitting || savingReference !== null");
});
test("onboarding continuation uses the settings save, with atomic completion", () => {
    const settings = source("features/settings/server/update-preferences.ts");
    expect(settings).toContain("db.transaction");
    expect(settings).toContain('"settings-complete", "welcome"');
    const prompt = source("features/onboarding/settings-next-step.tsx");
    expect(prompt).not.toContain("saveGuideProgress");
    expect(prompt).toContain("onContinue(true)");
    expect(source("features/settings/components/settings-form.tsx")).toContain(
        "onContinue={savePreferences}",
    );
});
