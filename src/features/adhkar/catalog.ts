export const ADHKAR = {
    morning: { chapter: 27, ar: "أذكار الصباح", en: "Morning adhkar" },
    evening: { chapter: 27, ar: "أذكار المساء", en: "Evening adhkar" },
    sleep: { chapter: 28, ar: "أذكار النوم", en: "Bedtime adhkar" },
    prayer: { chapter: 25, ar: "أذكار بعد الصلاة", en: "After salah" },
} as const;
export type AdhkarCategory = keyof typeof ADHKAR;
export function isAdhkarCategory(value: string): value is AdhkarCategory {
    return Object.hasOwn(ADHKAR, value);
}
