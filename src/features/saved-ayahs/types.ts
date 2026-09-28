import z from "zod";
import QuranInfo from "@/lib/quran-info";

const savedAyahMetadataSchema = z.object({
    globalAyahNumber: z.number().int().min(1).max(6236),
    surahNumber: z
        .number()
        .int()
        .min(QuranInfo.minSurahNumber)
        .max(QuranInfo.maxSurahNumber),
    ayahNumber: z.number().int().min(1).max(286),
    pageNumber: z
        .number()
        .int()
        .min(QuranInfo.minPageNumber)
        .max(QuranInfo.maxPageNumber),
    surahName: z.string().trim().min(1).max(100),
    arabicText: z.string().trim().min(1).max(2000),
});

export const bookmarkUpdateSchema = savedAyahMetadataSchema.extend({
    isBookmarked: z.boolean(),
});

export const reflectionUpdateSchema = savedAyahMetadataSchema.extend({
    reflection: z.string().trim().max(4000),
});

export type SavedAyahMetadata = z.infer<typeof savedAyahMetadataSchema>;

export const bookmarkCollectionNameSchema = z.string().trim().min(1).max(40);

export interface BookmarkCollection {
    id: string;
    name: string;
    ayahCount: number;
}

export interface SavedAyah {
    globalAyahNumber: number;
    surahNumber: number;
    ayahNumber: number;
    pageNumber: number;
    surahName: string;
    arabicText: string;
    isBookmarked: boolean;
    reflection: string | null;
    collections: BookmarkCollection[];
}
