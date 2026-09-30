import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
    progressSaveSchema,
    readProgressDraft,
} from "../src/features/wird/progress-save";

const draft = {
    globalAyahNumber: 9,
    surahNumber: 2,
    ayahNumber: 1,
    start: 8,
    end: 20,
    riwayah: "warsh",
    expectedRevision: "2026-09-30 12:00:00.123456+00",
};
test("failed save draft survives serialization with its exact concurrency revision", () => {
    expect(readProgressDraft(JSON.stringify(draft), 8, 20, "warsh")).toEqual(
        draft,
    );
});
test("drafts cannot be restored into another portion or riwayah", () => {
    const raw = JSON.stringify(draft);
    expect(readProgressDraft(raw, 21, 30, "warsh")).toBeNull();
    expect(readProgressDraft(raw, 8, 20, "hafs")).toBeNull();
});
test("corrupt or incomplete drafts cannot be retried", () => {
    for (const raw of [
        null,
        "{",
        "{}",
        JSON.stringify({ ...draft, expectedRevision: "" }),
        JSON.stringify({ ...draft, globalAyahNumber: 30 }),
    ]) {
        expect(readProgressDraft(raw, 8, 20, "warsh")).toBeNull();
    }
    expect(progressSaveSchema.safeParse({ ...draft, start: 30 }).success).toBe(
        false,
    );
});
test("save uses an atomic revision condition and returns a new precise revision", () => {
    const source = readFileSync(
        new URL(
            "../src/features/wird/server/update-wird-progress.ts",
            import.meta.url,
        ),
        "utf8",
    );
    expect(source).toContain(
        // biome-ignore lint/suspicious/noTemplateCurlyInString: Assert the literal parameterized SQL expression.
        "${userWird.updatedAt} = ${parsed.data.expectedRevision}::timestamptz",
    );
    expect(source).toContain("interval '1 microsecond'");
    expect(source).toContain('message: "conflict"');
    expect(source).toContain("revision = updated[0].revision");
});
