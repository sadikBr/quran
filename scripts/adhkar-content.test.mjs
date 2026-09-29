import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { restoreReadingProgress } from "../src/features/adhkar/reading-progress.ts";

const data = JSON.parse(
    readFileSync(
        new URL(
            "../src/features/adhkar/data/collections.json",
            import.meta.url,
        ),
        "utf8",
    ),
);
const { morning, evening, sleep, prayer } = data.collections;

test("combined surahs have paragraph breaks without changing their recitation text", () => {
    for (const entry of [
        sleep.find((e) => e.ID === 99),
        prayer.find((e) => e.ID === 70),
    ]) {
        const paragraphs = entry.ARABIC_TEXT.split("\n\n");
        assert.equal(paragraphs.length, 3);
        for (const paragraph of paragraphs) {
            assert.ok(paragraph.startsWith("بسم الله الرحمن الرحيم"));
            assert.equal((paragraph.match(/﴾/gu) || []).length, 1);
        }
        const normalize = (text) => text.replace(/\s+/gu, "");
        assert.ok(
            normalize(entry.originalText).includes(
                normalize(entry.ARABIC_TEXT),
            ),
        );
    }
    assert.equal(sleep.find((e) => e.ID === 99).repeat, 3);
});

test("all four bundled collections have valid, unique, traceable entries", () => {
    assert.deepEqual(Object.keys(data.collections), [
        "morning",
        "evening",
        "sleep",
        "prayer",
    ]);
    for (const entries of Object.values(data.collections)) {
        assert.ok(entries.length > 0);
        assert.equal(new Set(entries.map((e) => e.ID)).size, entries.length);
        for (const e of entries) {
            assert.ok(e.originalText.length > 0);
            assert.ok(e.ARABIC_TEXT.length > 0 || e.notes.length > 0);
            assert.ok(Number.isInteger(e.sourceId));
            assert.ok(
                e.repeat === null ||
                    (Number.isInteger(e.repeat) && e.repeat > 0),
            );
            assert.ok(!/\\[nt]/.test(e.ARABIC_TEXT));
        }
    }
});
test("morning and evening have explicit wording and time-specific membership", () => {
    for (const id of [93, 94, 95]) {
        assert.ok(morning.some((e) => e.ID === id));
        assert.ok(!evening.some((e) => e.ID === id));
    }
    assert.ok(!morning.some((e) => e.ID === 97));
    assert.ok(evening.some((e) => e.ID === 97));
    for (const id of [77, 78, 80, 81, 89, 90]) {
        const m = morning.find((e) => e.ID === id);
        const e = evening.find((e) => e.ID === id);
        assert.notEqual(m.ARABIC_TEXT, e.ARABIC_TEXT);
        assert.equal(m.originalText, e.originalText);
        assert.ok(!e.ARABIC_TEXT.includes("إذا أمسى"));
    }
    assert.ok(evening.find((e) => e.ID === 78).ARABIC_TEXT.includes("المصير"));
});
test("corrected and compound counts are explicit, not inferred at runtime", () => {
    assert.equal(morning.find((e) => e.ID === 83).repeat, 7);
    assert.deepEqual(
        sleep.filter((e) => e.sourceId === 106).map((e) => e.repeat),
        [33, 33, 34],
    );
    assert.deepEqual(
        prayer.filter((e) => e.sourceId === 69).map((e) => e.repeat),
        [33, 33, 33, 1],
    );
    assert.deepEqual(
        prayer.filter((e) => e.sourceId === 66).map((e) => e.repeat),
        [3, 1],
    );
    assert.deepEqual(
        morning.filter((e) => e.sourceId === 76).map((e) => e.repeat),
        [3, 3, 3],
    );
    for (const entries of Object.values(data.collections)) {
        for (const e of entries.filter((e) => e.review))
            assert.equal(e.repeat, null);
    }
});
test("legacy completion expands split entries and preserves the source cursor", () => {
    const progress = restoreReadingProgress(
        sleep,
        { day: "today", read: [106], index: 7 },
        "today",
        99,
    );
    assert.deepEqual(progress.read, [10601, 10602, 10603]);
    assert.equal(sleep[progress.index].sourceId, 106);
});
test("new progress uses stable IDs; undo on one part does not complete siblings", () => {
    const progress = restoreReadingProgress(
        sleep,
        { version: 2, day: "today", read: [10601], currentId: 10602 },
        "today",
        99,
    );
    assert.deepEqual(progress.read, [10601]);
    assert.equal(sleep[progress.index].ID, 10602);
});
test("stale or malformed progress is safe and removed cursors select an unread entry", () => {
    for (const saved of [null, 1, [], { day: "yesterday", read: [75] }])
        assert.deepEqual(restoreReadingProgress(morning, saved, "today", 75), {
            index: 0,
            read: [],
        });
    const result = restoreReadingProgress(
        evening,
        { day: "today", index: 18, read: [75, 93] },
        "today",
        75,
    );
    assert.deepEqual(result.read, [75]);
    assert.equal(result.index, 1);
});
