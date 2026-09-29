import assert from "node:assert/strict";
import test from "node:test";
import {
    formatAdhkarText,
    repetitionReference,
} from "../src/features/adhkar/format-entry.ts";

test("preserves Arabic and real newlines and tabs", () => {
    assert.equal(formatAdhkarText("ذِكْر\n\tنص"), "ذِكْر\n\tنص");
});
test("renders literal escaped formatting and normalizes CRLF", () => {
    assert.equal(formatAdhkarText("أ\\nب\\tج\\r\\nد\r\nهـ"), "أ\nب\tج\nد\nهـ");
});
test("does not decode HTML or unrelated escapes", () => {
    assert.equal(formatAdhkarText("<b>نص</b>\\u0627"), "<b>نص</b>\\u0627");
});
test("uses valid source counts and rejects missing or invalid metadata", () => {
    assert.equal(repetitionReference("ذكر", 3), 3);
    assert.equal(repetitionReference("ذكر", 4), 4);
    for (const value of [undefined, null, "3", 0, -1, 1.5, Infinity]) {
        assert.equal(repetitionReference("ذكر", value), null);
    }
});

test("explicit text overrides conflicting metadata without entry-specific IDs", () => {
    assert.equal(repetitionReference("((ذِكْر)) (سَبْعَ مَرّاتٍ).", 1), 7);
    assert.equal(repetitionReference("ذكر (ثلاثَ مرَّاتٍ)", 1), 3);
    assert.equal(repetitionReference("ذكر (أربعَ مَرَّاتٍ)", undefined), 4);
    assert.equal(repetitionReference("ذكر (مائة مرة)", 1), 100);
    assert.equal(repetitionReference("ذكر (ثلاثًا وثلاثين مرة)", 1), 33);
    assert.equal(repetitionReference("ذكر (مرتين)", 1), 2);
});
test("Arabic, Persian and Western digits are supported", () => {
    for (const digits of ["٣", "۳", "3"])
        assert.equal(repetitionReference(`ذكر (${digits} مرات)`, 1), 3);
});
test("ambiguous, alternative and multi-part instructions have no single target", () => {
    for (const text of [
        "ذكر (ثلاث مرات) وآخر (سبع مرات)",
        "ذكر (ثلاث مرات أو سبع مرات)",
        "من قاله مائة مرة",
        "ذكر (خمسين مرة)",
    ])
        assert.equal(repetitionReference(text, 1), null);
});
