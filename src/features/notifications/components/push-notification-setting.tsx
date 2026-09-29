"use client";

import { BellOff, BellRing, LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

type NotificationStatus =
    | "checking"
    | "unsupported"
    | "unconfigured"
    | "blocked"
    | "disabled"
    | "enabled";

export type ReminderPreferenceKey =
    | "wirdRemindersEnabled"
    | "meetingRemindersEnabled"
    | "assignmentRemindersEnabled";

function applicationServerKey(value: string) {
    const padding = "=".repeat((4 - (value.length % 4)) % 4);
    const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = window.atob(base64);
    const bytes = new Uint8Array(raw.length);
    for (let index = 0; index < raw.length; index += 1) {
        bytes[index] = raw.charCodeAt(index);
    }
    return bytes.buffer;
}

function supportsPush() {
    return (
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window
    );
}

export default function PushNotificationSetting({
    vapidPublicKey,
    reminderPreferences,
    onReminderPreferenceChange,
}: {
    vapidPublicKey: string | null;
    reminderPreferences: Record<ReminderPreferenceKey, boolean>;
    onReminderPreferenceChange: (
        key: ReminderPreferenceKey,
        enabled: boolean,
    ) => void;
}) {
    const t = useTranslations("Settings.notifications");
    const [status, setStatus] = useState<NotificationStatus>("checking");
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        let active = true;

        async function checkStatus() {
            if (!supportsPush()) {
                if (active) setStatus("unsupported");
                return;
            }
            if (!vapidPublicKey) {
                if (active) setStatus("unconfigured");
                return;
            }
            if (Notification.permission === "denied") {
                if (active) setStatus("blocked");
                return;
            }

            const registration =
                await navigator.serviceWorker.getRegistration("/");
            const subscription =
                await registration?.pushManager.getSubscription();
            if (active) setStatus(subscription ? "enabled" : "disabled");
        }

        checkStatus().catch(() => {
            if (active) setStatus("disabled");
        });
        return () => {
            active = false;
        };
    }, [vapidPublicKey]);

    async function enableNotifications() {
        if (!vapidPublicKey || !supportsPush()) return;
        setIsUpdating(true);

        try {
            const permission = await Notification.requestPermission();
            if (permission !== "granted") {
                setStatus(permission === "denied" ? "blocked" : "disabled");
                return;
            }

            await navigator.serviceWorker.register("/sw.js", { scope: "/" });
            const registration = await navigator.serviceWorker.ready;
            const existing = await registration.pushManager.getSubscription();
            const subscription =
                existing ??
                (await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: applicationServerKey(vapidPublicKey),
                }));
            const json = subscription.toJSON();
            const response = await fetch("/api/notifications/subscription", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(json),
            });
            if (!response.ok) {
                if (!existing) await subscription.unsubscribe();
                throw new Error("Subscription could not be saved.");
            }

            setStatus("enabled");
            toast.success(t("enabledFeedback"));
        } catch {
            toast.error(t("errorFeedback"));
        } finally {
            setIsUpdating(false);
        }
    }

    async function disableNotifications() {
        if (!supportsPush()) return;
        setIsUpdating(true);

        try {
            const registration =
                await navigator.serviceWorker.getRegistration("/");
            const subscription =
                await registration?.pushManager.getSubscription();
            if (subscription) {
                const response = await fetch(
                    "/api/notifications/subscription",
                    {
                        method: "DELETE",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({
                            endpoint: subscription.endpoint,
                        }),
                    },
                );
                if (!response.ok) {
                    throw new Error("Subscription could not be removed.");
                }
                await subscription.unsubscribe();
            }

            setStatus("disabled");
            toast.success(t("disabledFeedback"));
        } catch {
            toast.error(t("errorFeedback"));
        } finally {
            setIsUpdating(false);
        }
    }

    const unavailable =
        status === "unsupported" ||
        status === "unconfigured" ||
        status === "blocked";
    const categories: Array<{
        key: ReminderPreferenceKey;
        translationKey: "wird" | "meetings" | "assignments";
    }> = [
        { key: "wirdRemindersEnabled", translationKey: "wird" },
        { key: "meetingRemindersEnabled", translationKey: "meetings" },
        {
            key: "assignmentRemindersEnabled",
            translationKey: "assignments",
        },
    ];

    return (
        <div>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/50 p-3 sm:p-4">
                <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        {status === "enabled" ? (
                            <BellRing className="size-4" aria-hidden="true" />
                        ) : (
                            <BellOff className="size-4" aria-hidden="true" />
                        )}
                    </span>
                    <span
                        aria-live="polite"
                        className="text-sm font-medium leading-6"
                    >
                        {t(`status.${status}`)}
                    </span>
                </div>
                <Button
                    type="button"
                    size="sm"
                    variant={status === "enabled" ? "outline" : "default"}
                    disabled={
                        isUpdating || status === "checking" || unavailable
                    }
                    onClick={
                        status === "enabled"
                            ? disableNotifications
                            : enableNotifications
                    }
                    className="min-h-11 shrink-0 rounded-xl"
                >
                    {isUpdating && (
                        <LoaderCircle
                            className="size-3.5 animate-spin"
                            aria-hidden="true"
                        />
                    )}
                    {t(status === "enabled" ? "disable" : "enable")}
                </Button>
            </div>
            {status === "blocked" && (
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    {t("blockedHint")}
                </p>
            )}
            <div className="mt-5">
                <h3 className="text-sm font-semibold">{t("title")}</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {t("description")}
                </p>
            </div>
            <div className="mt-3 grid gap-3 lg:grid-cols-3">
                {categories.map((category) => {
                    const id = `notification-${category.translationKey}`;
                    return (
                        <div
                            key={category.key}
                            className="flex items-start justify-between gap-3 rounded-xl border border-border/60 bg-background/30 p-4"
                        >
                            <label
                                htmlFor={id}
                                className="min-w-0 cursor-pointer"
                            >
                                <span className="block text-sm font-medium">
                                    {t(
                                        `categories.${category.translationKey}.title`,
                                    )}
                                </span>
                                <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                                    {t(
                                        `categories.${category.translationKey}.description`,
                                    )}
                                </span>
                            </label>
                            <Checkbox
                                id={id}
                                checked={reminderPreferences[category.key]}
                                onCheckedChange={(checked) =>
                                    onReminderPreferenceChange(
                                        category.key,
                                        checked === true,
                                    )
                                }
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
