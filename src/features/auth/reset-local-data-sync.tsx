"use client";

import { useEffect } from "react";
import { clearResetAccountDrafts } from "./reset-local-data";

export default function ResetLocalDataSync({
    userId,
    resetAt,
}: {
    userId?: string;
    resetAt?: string;
}) {
    useEffect(() => {
        if (!userId || !resetAt) return;
        try {
            clearResetAccountDrafts(localStorage, userId, resetAt);
        } catch {
            /* Readers also use reset-specific keys when device storage is unavailable. */
        }
    }, [userId, resetAt]);
    return null;
}
