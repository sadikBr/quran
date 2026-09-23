import z from "zod";
import QuranInfo from "@/lib/quran-info";

export type ReadingProgress = {
    lastPageNumber: number | null;
    lastSurahNumber: number | null;
};

export const readingProgressUpdateZodSchema = z.discriminatedUnion(
    "locationType",
    [
        z.object({
            locationType: z.literal("page"),
            number: z
                .number()
                .int()
                .min(QuranInfo.minPageNumber)
                .max(QuranInfo.maxPageNumber),
        }),
        z.object({
            locationType: z.literal("surah"),
            number: z
                .number()
                .int()
                .min(QuranInfo.minSurahNumber)
                .max(QuranInfo.maxSurahNumber),
        }),
    ],
);

export type ReadingProgressUpdate = z.infer<
    typeof readingProgressUpdateZodSchema
>;
