import assert from "node:assert/strict";
import test from "node:test";
import { loadTypeScript } from "./helpers/load-typescript.mjs";

const { clearResetAccountDrafts } = loadTypeScript(
    "src/features/auth/reset-local-data.ts",
    {},
);
function storage(values) {
    const map = new Map(Object.entries(values));
    return {
        get length() {
            return map.size;
        },
        key: (i) => [...map.keys()][i] ?? null,
        getItem: (key) => map.get(key) ?? null,
        setItem: (key, value) => map.set(key, value),
        removeItem: (key) => map.delete(key),
    };
}
test("reset clears only this account's older learning drafts, retaining new drafts and shared downloads", () => {
    const saved = storage({
        "random-start:alice:hafs": "old",
        "random-start:alice:warsh:1": "old",
        "random-start:alice:hafs:2": "new",
        "quran:wird-draft:v1:alice:day:1:7:hafs": "old",
        "quran:wird-draft:v1:alice:day:1:7:hafs:2": "new",
        "random-start:bob:hafs": "other",
        "random-start:alice2:hafs": "other",
        "quran-offline-library": "shared",
    });
    clearResetAccountDrafts(saved, "alice", "2");
    for (const key of [
        "random-start:alice:hafs",
        "random-start:alice:warsh:1",
        "quran:wird-draft:v1:alice:day:1:7:hafs",
    ])
        assert.equal(saved.getItem(key), null);
    for (const key of [
        "random-start:alice:hafs:2",
        "quran:wird-draft:v1:alice:day:1:7:hafs:2",
    ])
        assert.equal(saved.getItem(key), "new");
    assert.equal(saved.getItem("random-start:bob:hafs"), "other");
    assert.equal(saved.getItem("random-start:alice2:hafs"), "other");
    assert.equal(saved.getItem("quran-offline-library"), "shared");
    assert.equal(saved.getItem("quran:data-reset:alice"), "2");
    clearResetAccountDrafts(saved, "alice", "2");
    assert.equal(saved.getItem("random-start:alice:hafs:2"), "new");
    clearResetAccountDrafts(saved, "alice", "3");
    assert.equal(saved.getItem("random-start:alice:hafs:2"), null);
});
