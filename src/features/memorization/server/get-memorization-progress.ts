import "server-only";
import getPreferences from "@/features/settings/server/get-preferences";
import type { Riwayah } from "../progress";
import getMemorizationRecord from "./get-memorization-record";

export default async function getMemorizationProgress(
    userId: string,
    riwayah?: Riwayah,
) {
    const reading = riwayah ?? (await getPreferences()).riwayah;
    return (await getMemorizationRecord(userId, reading)).completedHizbs;
}
