import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { guides, isGuideId } from "../src/features/onboarding/guides";

test("only registered guide IDs are accepted", () => {
    for (const id of Object.keys(guides)) expect(isGuideId(id)).toBe(true);
    for (const id of ["", "constructor", "__proto__", "https://example.com"])
        expect(isGuideId(id)).toBe(false);
});
test("initial guides have three bilingual steps and local destinations", () => {
    expect(Object.keys(guides)).toHaveLength(3);
    for (const guide of Object.values(guides)) {
        expect(guide.path.startsWith("/")).toBe(true);
        expect(guide.steps).toHaveLength(3);
        for (const step of guide.steps) {
            expect(step.text).toHaveLength(2);
            expect(step.text.every((text) => text.length > 20)).toBe(true);
        }
    }
});
test("every tour target is wired into the relevant page or component", () => {
    const files = [
        "src/app/wird/page.tsx",
        "src/app/assignments/page.tsx",
        "src/features/memorization/components/random-start-test.tsx",
    ];
    const markup = files.map((file) => readFileSync(file, "utf8")).join("\n");
    for (const guide of Object.values(guides))
        for (const step of guide.steps)
            expect(markup).toContain(`data-tour="${step.target}"`);
});
