import "server-only";

import webpush from "web-push";
import { env } from "@/data/env/server";

export function configureWebPush() {
    if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) return false;

    const subject =
        env.PRODUCTION_URLS.split(",")
            .map((value) => value.trim())
            .find((value) => value.startsWith("https://")) ??
        "https://quran.brahimsadik.com";

    webpush.setVapidDetails(
        subject,
        env.VAPID_PUBLIC_KEY,
        env.VAPID_PRIVATE_KEY,
    );
    return true;
}

export function isExpiredPushSubscription(error: unknown) {
    if (!error || typeof error !== "object" || !("statusCode" in error)) {
        return false;
    }

    return error.statusCode === 404 || error.statusCode === 410;
}
