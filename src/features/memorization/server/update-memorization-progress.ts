"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import z from "zod";
import db from "@/drizzle/db";
import { userMemorizedHizb } from "@/drizzle/schema";
import { auth } from "@/features/auth/auth";

const updateSchema = z.object({
    hizbNumber: z.number().int().min(1).max(60),
    completed: z.boolean(),
});

export default async function updateMemorizationProgress(input: unknown) {
    const parsed = updateSchema.safeParse(input);
    if (!parsed.success) return { success: false as const };

    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return { success: false as const };

    try {
        if (parsed.data.completed) {
            await db
                .insert(userMemorizedHizb)
                .values({
                    userId: session.user.id,
                    hizbNumber: parsed.data.hizbNumber,
                })
                .onConflictDoUpdate({
                    target: [
                        userMemorizedHizb.userId,
                        userMemorizedHizb.hizbNumber,
                    ],
                    set: { completedAt: new Date() },
                });
        } else {
            await db
                .delete(userMemorizedHizb)
                .where(
                    and(
                        eq(userMemorizedHizb.userId, session.user.id),
                        eq(
                            userMemorizedHizb.hizbNumber,
                            parsed.data.hizbNumber,
                        ),
                    ),
                );
        }

        revalidatePath("/dashboard");
        revalidatePath("/memorization");
        return { success: true as const };
    } catch {
        return { success: false as const };
    }
}
