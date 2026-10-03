"use server";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import db from "@/drizzle/db";
import { user } from "@/drizzle/schema";
import { auth } from "@/features/auth/auth";
import getMemoryCatalogue from "@/features/memorization/server/get-memory-catalogue";
import { lockRecord } from "@/features/memorization/server/record-service";
import { mistakeSchema } from "../types";
import { changeMistake, recordMistake } from "./mistakes";
import { retentionState } from "./state";

const addSchema = mistakeSchema.extend({
    riwayah: z.enum(["hafs", "warsh"]),
    eventId: z.uuid(),
});
const updateSchema = z.object({
    id: z.uuid(),
    revision: z.number().int().positive(),
    eventId: z.uuid(),
    action: z.enum(["practised", "resolved", "reopened"]),
});

async function mutate(input: unknown, update: boolean) {
    const parsed = (update ? updateSchema : addSchema).safeParse(input);
    if (!parsed.success) return { success: false as const, reason: "invalid" };
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return { success: false as const, reason: "unauthorized" };
    const catalogue = await getMemoryCatalogue();
    try {
        const result = await db.transaction(async (tx) => {
            // Serialize against reset/suspension, then re-check a request authenticated before it.
            const [account] = await tx
                .select()
                .from(user)
                .where(eq(user.id, session.user.id))
                .for("update");
            if (
                !account ||
                account.role === "admin" ||
                account.suspendedAt ||
                (account.sessionsRevokedAt &&
                    +account.sessionsRevokedAt >=
                        +new Date(session.session.createdAt))
            )
                return { success: false as const, reason: "unauthorized" };
            await lockRecord(tx, account.id);
            if ("action" in parsed.data) {
                const state = await retentionState(
                    account.id,
                    catalogue,
                    "UTC",
                    new Date(),
                    tx,
                );
                return changeMistake(
                    tx,
                    account.id,
                    parsed.data,
                    catalogue,
                    state.covered,
                );
            }
            const { riwayah, eventId, ...value } = parsed.data;
            await recordMistake(
                tx,
                account.id,
                account.id,
                riwayah,
                value,
                `${account.id}:${eventId}`,
                catalogue,
            );
            return { success: true as const };
        });
        if (result.success) revalidatePath("/memorization", "layout");
        return result;
    } catch {
        return { success: false as const, reason: "failed" };
    }
}
export async function addMemorizationMistake(input: unknown) {
    return mutate(input, false);
}
export async function updateMemorizationMistake(input: unknown) {
    return mutate(input, true);
}
