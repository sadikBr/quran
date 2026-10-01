import "server-only";

import { and, eq, gt } from "drizzle-orm";
import webpush, { type PushSubscription, type RequestOptions } from "web-push";
import { env } from "@/data/env/server";
import db from "@/drizzle/db";
import { pushSubscription, session } from "@/drizzle/schema";
import { pushSubscriptionSchema } from "../push-subscription";

class InvalidPushSubscription extends Error {}

/** Apply the same checks to previously stored subscriptions on every delivery. */
export async function sendPushNotification(
    subscription: PushSubscription & { userId: string },
    payload: string,
    options: RequestOptions = {},
) {
    if (!pushSubscriptionSchema.safeParse(subscription).success)
        throw new InvalidPushSubscription("Unsupported push subscription.");
    const [owner] = await db
        .select({
            userId: pushSubscription.userId,
            sessionId: pushSubscription.sessionId,
        })
        .from(pushSubscription)
        .innerJoin(
            session,
            and(
                eq(session.id, pushSubscription.sessionId),
                eq(session.userId, pushSubscription.userId),
            ),
        )
        .where(
            and(
                eq(pushSubscription.userId, subscription.userId),
                eq(pushSubscription.endpoint, subscription.endpoint),
                eq(pushSubscription.p256dh, subscription.keys.p256dh),
                eq(pushSubscription.auth, subscription.keys.auth),
                gt(session.expiresAt, new Date()),
            ),
        )
        .limit(1);
    // A stale delivery may refer to a device since claimed by another account.
    // Do not classify that as expired: callers would delete its new subscription.
    if (!owner) throw new Error("The subscription session has ended.");

    return webpush.sendNotification(
        subscription,
        JSON.stringify({
            ...JSON.parse(payload),
            recipientSessionId: owner.sessionId,
        }),
        { ...options, timeout: 10_000 },
    );
}

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
    if (error instanceof InvalidPushSubscription) return true;
    if (!error || typeof error !== "object" || !("statusCode" in error)) {
        return false;
    }

    return error.statusCode === 404 || error.statusCode === 410;
}
