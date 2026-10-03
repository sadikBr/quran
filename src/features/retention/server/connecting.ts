import "server-only";
import type { Riwayah } from "@/features/memorization/progress";
import getMemoryCatalogue from "@/features/memorization/server/get-memory-catalogue";
import { connectingVerses } from "../activity";
import { retentionState } from "./state";
import { exerciseVerses } from "./verses";

export async function getConnectingPassage(
    userId: string,
    riwayah: Riwayah,
    start: { surahNumber: number; ayahNumber: number },
) {
    const catalogue = await getMemoryCatalogue();
    const state = await retentionState(userId, catalogue, "UTC", new Date());
    const context = connectingVerses(catalogue[riwayah], start, state.covered);
    if (!context.length) return [];
    const keys = new Set(
        context.map((v) => `${v.surahNumber}:${v.ayahNumber}`),
    );
    return (await exerciseVerses(riwayah)).filter((v) =>
        keys.has(`${v.surahNumber}:${v.ayahNumber}`),
    );
}
