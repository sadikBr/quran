import { z } from "zod";

export const wirdCompletionSchema = z
    .object({
        targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        start: z.number().int().min(1).max(6236),
        end: z.number().int().min(1).max(6236),
        revision: z.string().min(1).max(80),
    })
    .refine((value) => value.start <= value.end);

export type WirdCompletion = z.infer<typeof wirdCompletionSchema>;
