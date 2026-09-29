import assert from "node:assert/strict";
import test from "node:test";
import { incrementRepetition } from "../src/features/adhkar/counter.ts";

test("completes exactly on the target tap", () => {
    assert.deepEqual(incrementRepetition(0, 3), { count: 1, complete: false });
    assert.deepEqual(incrementRepetition(2, 3), { count: 3, complete: true });
});
test("single recitations complete on the first tap", () => {
    assert.deepEqual(incrementRepetition(0, 1), { count: 1, complete: true });
});
test("unrestricted entries never auto-complete", () => {
    assert.deepEqual(incrementRepetition(100, null), {
        count: 101,
        complete: false,
    });
});
test("a completed counter does not exceed its target", () => {
    assert.deepEqual(incrementRepetition(33, 33), {
        count: 33,
        complete: true,
    });
});
