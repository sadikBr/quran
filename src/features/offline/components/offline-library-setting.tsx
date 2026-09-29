"use client";

import { Check, CloudDownload, RefreshCw, WifiOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { OfflineLibraryStatus } from "../types";
import {
    OFFLINE_STATUS_EVENT,
    OFFLINE_STATUS_STORAGE_KEY,
} from "./offline-library-manager";

function savedStatus(): OfflineLibraryStatus {
    if (typeof window === "undefined") return { state: "idle" };
    try {
        const value = localStorage.getItem(OFFLINE_STATUS_STORAGE_KEY);
        return value ? JSON.parse(value) : { state: "idle" };
    } catch {
        return { state: "idle" };
    }
}

export default function OfflineLibrarySetting() {
    const t = useTranslations("Settings.offline");
    // Browser storage and capabilities are unknown during server rendering.
    // Keep the first client render identical, then load this device's status.
    const [status, setStatus] = useState<OfflineLibraryStatus>({
        state: "idle",
    });
    const [supported, setSupported] = useState<boolean | null>(null);

    useEffect(() => {
        function handleStatus(event: Event) {
            setStatus((event as CustomEvent<OfflineLibraryStatus>).detail);
        }

        window.addEventListener(OFFLINE_STATUS_EVENT, handleStatus);
        setSupported("serviceWorker" in navigator);
        setStatus(savedStatus());
        navigator.serviceWorker?.controller?.postMessage({
            type: "GET_QURAN_LIBRARY_STATUS",
        });
        return () =>
            window.removeEventListener(OFFLINE_STATUS_EVENT, handleStatus);
    }, []);

    function refresh() {
        setStatus({ state: "downloading", current: 0, total: 3 });
        navigator.serviceWorker?.controller?.postMessage({
            type: "REFRESH_QURAN_LIBRARY",
        });
    }

    const progress =
        status.total && status.current !== undefined
            ? Math.round((status.current / status.total) * 100)
            : 0;
    const StateIcon =
        supported === false
            ? WifiOff
            : status.state === "ready"
              ? Check
              : status.state === "error"
                ? WifiOff
                : CloudDownload;

    return (
        <div className="space-y-3">
            <div className="flex min-h-11 items-center justify-between gap-4 rounded-xl bg-muted/35 px-3.5 py-2.5">
                <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <StateIcon className="size-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                        <p className="text-sm font-medium">
                            {supported === false
                                ? t("status.unsupported")
                                : t(`status.${status.state}`)}
                        </p>
                        {status.state === "downloading" && (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                {t("progress", { progress })}
                            </p>
                        )}
                    </div>
                </div>
                {supported && status.state !== "downloading" && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={refresh}
                        aria-label={t("refresh")}
                        title={t("refresh")}
                    >
                        <RefreshCw className="size-4" />
                    </Button>
                )}
            </div>
            {status.state === "downloading" && (
                <div className="h-1 overflow-hidden rounded-full bg-muted">
                    <div
                        className="h-full rounded-full bg-primary transition-[width] duration-500"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            )}
        </div>
    );
}
