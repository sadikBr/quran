import { expect, test } from "bun:test";
import { pageQuarter } from "../src/features/quran/components/page-division-summary";

const ref = (number, surahNumber, ayahNumber) => ({
    number,
    surahNumber,
    ayahNumber,
    globalAyahNumber: 0,
    pageNumber: number,
});
const navigation = {
    pages: [ref(1, 1, 1), ref(2, 2, 1), ref(3, 2, 10), ref(4, 2, 20)],
    hizbQuarters: [ref(1, 1, 1), ref(2, 2, 5), ref(3, 2, 20)],
    juzs: [],
    hizbs: [],
};

test("adjacent pages use their own starting quarter, including exact boundaries", () => {
    expect(pageQuarter(navigation, 2)).toBe(1);
    expect(pageQuarter(navigation, 3)).toBe(2);
    expect(pageQuarter(navigation, 4)).toBe(3);
});
test("missing and out-of-range pages never repeat current-page data", () => {
    expect(pageQuarter(navigation, 0)).toBeUndefined();
    expect(pageQuarter(navigation, 5)).toBeUndefined();
    expect(pageQuarter({ ...navigation, pages: [] }, 1)).toBeUndefined();
});
