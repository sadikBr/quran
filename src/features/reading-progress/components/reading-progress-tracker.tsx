"use client";

import { useEffect } from "react";
import { authClient } from "@/features/auth/auth-client";
import updateReadingProgress from "../server/update-reading-progress";
import type { ReadingProgressUpdate } from "../types";

export default function ReadingProgressTracker({
    locationType,
    number,
}: ReadingProgressUpdate) {
    const { data: session } = authClient.useSession();

    useEffect(() => {
        if (!session) return;

        void updateReadingProgress({ locationType, number });
    }, [locationType, number, session]);

    return null;
}
