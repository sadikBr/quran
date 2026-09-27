"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { toast } from "sonner";

const NETWORK_TOAST_ID = "network-status";

export default function ConnectionStatus() {
    const t = useTranslations("Common.feedback");

    useEffect(() => {
        function showOfflineMessage() {
            toast.error(t("networkOffline"), {
                id: NETWORK_TOAST_ID,
                duration: Number.POSITIVE_INFINITY,
            });
        }

        function showOnlineMessage() {
            toast.success(t("networkRestored"), {
                id: NETWORK_TOAST_ID,
                duration: 3000,
            });
        }

        if (!navigator.onLine) showOfflineMessage();

        window.addEventListener("offline", showOfflineMessage);
        window.addEventListener("online", showOnlineMessage);

        return () => {
            window.removeEventListener("offline", showOfflineMessage);
            window.removeEventListener("online", showOnlineMessage);
            toast.dismiss(NETWORK_TOAST_ID);
        };
    }, [t]);

    return null;
}
