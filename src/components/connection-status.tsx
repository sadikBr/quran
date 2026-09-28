"use client";

import { BookOpen, ChevronRight, CloudOff } from "lucide-react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const NETWORK_TOAST_ID = "network-status";

export default function ConnectionStatus() {
    const t = useTranslations("Common.feedback");
    const pathname = usePathname();
    const [isOffline, setIsOffline] = useState(false);
    const [isOfflineReader, setIsOfflineReader] = useState(false);

    useEffect(() => {
        function showOfflineMessage() {
            setIsOffline(true);
        }

        function showOnlineMessage() {
            setIsOffline(false);
            toast.dismiss(NETWORK_TOAST_ID);
            toast.success(t("networkRestored"), {
                id: NETWORK_TOAST_ID,
                duration: 3000,
            });
        }

        setIsOfflineReader(
            pathname.startsWith("/offline") ||
                Boolean(document.querySelector("[data-offline-reader]")),
        );
        if (!navigator.onLine) showOfflineMessage();

        window.addEventListener("offline", showOfflineMessage);
        window.addEventListener("online", showOnlineMessage);

        return () => {
            window.removeEventListener("offline", showOfflineMessage);
            window.removeEventListener("online", showOnlineMessage);
            toast.dismiss(NETWORK_TOAST_ID);
        };
    }, [pathname, t]);

    if (!isOffline || isOfflineReader) return null;

    return (
        <aside className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[60] mx-auto max-w-md">
            <a
                href="/offline"
                className="group flex min-h-16 items-center gap-3 rounded-2xl bg-foreground px-3 py-2.5 text-background shadow-2xl shadow-black/20 ring-1 ring-background/10 transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-primary sm:px-4"
            >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                    <CloudOff className="size-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">
                        {t("offlineTitle")}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-background/65">
                        {t("offlineReady")}
                    </span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5 rounded-xl bg-background/10 px-2.5 py-2 text-xs font-semibold">
                    <BookOpen className="size-4" aria-hidden="true" />
                    <span className="hidden min-[420px]:inline">
                        {t("openOfflineQuran")}
                    </span>
                    <ChevronRight className="size-4 rtl:rotate-180" />
                </span>
            </a>
        </aside>
    );
}
