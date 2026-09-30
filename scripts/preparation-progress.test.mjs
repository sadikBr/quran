import { expect, test } from "bun:test";
import { preparedAyahs } from "../src/features/practice/preparation-progress";

test("ready assignments show full preparation even without a saved cursor", () => {
    expect(preparedAyahs("submitted", 7, 0)).toBe(7);
    expect(preparedAyahs("submitted", 7, 3)).toBe(7);
    expect(preparedAyahs("completed", 7, 0)).toBe(7);
});
test("continuing practice cannot reduce confirmed preparation", () => {
    expect(preparedAyahs("submitted", 20, 1)).toBe(20);
});
test("work returned for revision uses actual progress again", () => {
    expect(preparedAyahs("needs_revision", 7, 0)).toBe(0);
    expect(preparedAyahs("needs_revision", 7, 2)).toBe(2);
    expect(preparedAyahs("not_completed", 7, 0)).toBe(0);
    expect(preparedAyahs("in_progress", 7, 3)).toBe(3);
});
test("empty and out-of-range saved counts stay bounded", () => {
    expect(preparedAyahs("submitted", 0, 0)).toBe(0);
    expect(preparedAyahs("in_progress", 7, -1)).toBe(0);
    expect(preparedAyahs("in_progress", 7, 30)).toBe(7);
});
