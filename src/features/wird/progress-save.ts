import { z } from "zod";

export const progressSaveSchema = z
    .object({
        globalAyahNumber: z.number().int().min(1).max(6236),
        start: z.number().int().min(1).max(6236),
        end: z.number().int().min(1).max(6236),
        surahNumber: z.number().int().min(1).max(114),
        ayahNumber: z.number().int().min(1).max(286),
        expectedRevision: z.string().min(1).max(80),
        riwayah: z.enum(["hafs", "warsh"]),
    })
    .refine(
        (value) =>
            value.start <= value.end &&
            value.globalAyahNumber >= value.start &&
            value.globalAyahNumber <= value.end,
    );
export type ProgressSave = z.infer<typeof progressSaveSchema>;

export function readProgressDraft(
    raw: string | null,
    start: number,
    end: number,
    riwayah: "hafs" | "warsh",
): ProgressSave | null {
    try {
        const parsed = progressSaveSchema.safeParse(JSON.parse(raw ?? "null"));
        if (
            !parsed.success ||
            parsed.data.start !== start ||
            parsed.data.end !== end ||
            parsed.data.riwayah !== riwayah
        )
            return null;
        return parsed.data;
    } catch {
        return null;
    }
}
