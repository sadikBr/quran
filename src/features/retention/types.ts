import { z } from "zod";
import { quranReferenceSchema } from "@/features/practice/types";

export const mistakeSchema = quranReferenceSchema.extend({
    kind: z.enum(["word", "continuation", "transition"]),
    note: z.string().trim().max(1000).default(""),
});
export type MistakeInput = z.infer<typeof mistakeSchema>;
export type MistakeView = MistakeInput & {
    id: string;
    riwayah: "hafs" | "warsh";
    occurrences: number;
    practiceCount: number;
    revision: number;
    resolvedAt: string | null;
    lastOccurredAt: string;
    reviewer: boolean;
    memorized: boolean;
};
export type ExerciseVerse = {
    surahNumber: number;
    ayahNumber: number;
    text: string;
    surahName: string;
    englishName: string;
};
