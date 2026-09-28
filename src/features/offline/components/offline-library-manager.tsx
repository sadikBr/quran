"use client";

import { useEffect } from "react";
import type { OfflineLibraryStatus } from "../types";

export const OFFLINE_STATUS_STORAGE_KEY = "quran-offline-library-status";
export const OFFLINE_STATUS_EVENT = "quran-offline-library-status-change";

function saveStatus(status: OfflineLibraryStatus) {
    localStorage.setItem(OFFLINE_STATUS_STORAGE_KEY, JSON.stringify(status));
    window.dispatchEvent(
        new CustomEvent(OFFLINE_STATUS_EVENT, { detail: status }),
    );
}

export default function OfflineLibraryManager() {
    useEffect(() => {
        if (!("serviceWorker" in navigator)) return;

        function handleMessage(event: MessageEvent) {
            if (event.data?.type !== "QURAN_OFFLINE_STATUS") return;
            saveStatus(event.data.status as OfflineLibraryStatus);
        }

        function redirectOfflineQuranNavigation(event: MouseEvent) {
            if (
                navigator.onLine ||
                event.defaultPrevented ||
                event.button !== 0
            )
                return;
            const target = event.target;
            if (!(target instanceof Element)) return;
            const anchor = target.closest("a");
            if (!anchor) return;
            const url = new URL(anchor.href, window.location.href);
            if (
                url.origin !== window.location.origin ||
                !url.pathname.startsWith("/quran")
            )
                return;

            event.preventDefault();
            const match = url.pathname.match(/\/quran\/surah\/(\d+)/);
            const surah = match?.[1] ?? "1";
            window.location.assign(`/offline?surah=${surah}`);
        }

        navigator.serviceWorker.addEventListener("message", handleMessage);
        document.addEventListener("click", redirectOfflineQuranNavigation);

        void navigator.serviceWorker
            .register("/sw.js", { scope: "/" })
            .then(async (registration) => {
                if (navigator.storage?.persist) {
                    await navigator.storage.persist().catch(() => false);
                }
                const worker =
                    registration.active ??
                    registration.waiting ??
                    registration.installing;
                worker?.postMessage({ type: "DOWNLOAD_QURAN_LIBRARY" });
            })
            .catch(() => {
                saveStatus({ state: "error" });
            });

        return () => {
            navigator.serviceWorker.removeEventListener(
                "message",
                handleMessage,
            );
            document.removeEventListener(
                "click",
                redirectOfflineQuranNavigation,
            );
        };
    }, []);

    return null;
}
