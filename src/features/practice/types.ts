import { z } from "zod";
import type { Riwayah } from "@/features/settings/preferences";

export const PRACTICE_KINDS = ["memorization", "revision"] as const;
export type PracticeKind = (typeof PRACTICE_KINDS)[number];

export const quranReferenceSchema = z.object({
    surahNumber: z.number().int().min(1).max(114),
    ayahNumber: z.number().int().min(1).max(286),
});

export const practiceRangeSchema = z.object({
    kind: z.enum(PRACTICE_KINDS),
    start: quranReferenceSchema,
    end: quranReferenceSchema,
});

export type QuranReference = z.infer<typeof quranReferenceSchema>;

export interface PracticeAssignment {
    id: string;
    kind: PracticeKind;
    riwayah: Riwayah;
    start: QuranReference;
    end: QuranReference;
    progress: QuranReference | null;
    status: "in_progress" | "submitted" | "completed" | "needs_revision";
    source: "personal" | "group";
    groupId: string | null;
    groupName: string | null;
    assignedByName: string | null;
    instructions: string | null;
    dueAt: Date | null;
}

export function referenceOrder(reference: QuranReference) {
    return reference.surahNumber * 1_000 + reference.ayahNumber;
}

export function isReferenceWithin(
    reference: QuranReference,
    start: QuranReference,
    end: QuranReference,
) {
    const value = referenceOrder(reference);
    return value >= referenceOrder(start) && value <= referenceOrder(end);
}
