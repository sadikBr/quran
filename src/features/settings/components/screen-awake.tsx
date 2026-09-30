"use client";

import { useEffect } from "react";

export default function ScreenAwake({ enabled }: { enabled: boolean }) {
    useEffect(() => {
        if (!enabled || !("wakeLock" in navigator)) return;
        let disposed = false;
        let pending = false;
        let lock: WakeLockSentinel | undefined;
        async function acquire() {
            if (
                disposed ||
                pending ||
                (lock && !lock.released) ||
                document.visibilityState !== "visible"
            )
                return;
            pending = true;
            try {
                const acquired = await navigator.wakeLock.request("screen");
                if (disposed || document.visibilityState !== "visible") {
                    await acquired.release();
                } else {
                    lock = acquired;
                }
            } catch {
                // Battery policies/permissions may deny a lock; normal use continues.
            } finally {
                pending = false;
            }
        }
        function visibilityChanged() {
            if (document.visibilityState === "visible") void acquire();
            else if (lock) void lock.release().catch(() => {});
        }
        void acquire();
        document.addEventListener("visibilitychange", visibilityChanged);
        document.addEventListener("pointerdown", acquire);
        document.addEventListener("keydown", acquire);
        return () => {
            disposed = true;
            document.removeEventListener("visibilitychange", visibilityChanged);
            document.removeEventListener("pointerdown", acquire);
            document.removeEventListener("keydown", acquire);
            if (lock) void lock.release().catch(() => {});
        };
    }, [enabled]);
    return null;
}
