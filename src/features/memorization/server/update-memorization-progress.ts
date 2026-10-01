"use server";

/** Kept for stale clients: individual grid toggles can no longer mutate the starting record. */
export default async function updateMemorizationProgress(_input: unknown) {
    return { success: false as const };
}
