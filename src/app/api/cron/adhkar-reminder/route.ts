import { and, eq, isNull, lt, ne, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import webpush from "web-push";
import { env } from "@/data/env/server";
import db from "@/drizzle/db";
import {
    adhkarReminderDelivery,
    pushSubscription,
    user,
    userSettings,
} from "@/drizzle/schema";
import { dueAdhkarDate } from "@/features/adhkar/reminder-schedule";
import {
    configureWebPush,
    isExpiredPushSubscription,
} from "@/features/notifications/server/web-push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    if (
        !env.CRON_SECRET ||
        request.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`
    )
        return NextResponse.json({ success: false }, { status: 401 });
    if (!configureWebPush())
        return NextResponse.json(
            { success: false, reason: "Push is not configured" },
            { status: 503 },
        );
    const now = new Date();
    const rows = await db
        .select({ subscription: pushSubscription, settings: userSettings })
        .from(pushSubscription)
        .innerJoin(
            userSettings,
            eq(userSettings.userId, pushSubscription.userId),
        )
        .innerJoin(user, eq(user.id, pushSubscription.userId))
        .where(
            and(
                ne(user.role, "admin"),
                or(
                    ne(userSettings.morningAdhkarTime, ""),
                    ne(userSettings.eveningAdhkarTime, ""),
                ),
            ),
        );
    let sent = 0,
        failed = 0,
        duplicate = 0;
    for (const { subscription, settings } of rows) {
        for (const kind of ["morning", "evening"] as const) {
            const localDate = dueAdhkarDate(
                kind === "morning"
                    ? settings.morningAdhkarTime
                    : settings.eveningAdhkarTime,
                settings.adhkarTimezone,
                now,
            );
            if (!localDate) continue;
            const key = and(
                eq(adhkarReminderDelivery.subscriptionId, subscription.id),
                eq(adhkarReminderDelivery.kind, kind),
                eq(adhkarReminderDelivery.localDate, localDate),
            );
            const claim = await db
                .insert(adhkarReminderDelivery)
                .values({
                    subscriptionId: subscription.id,
                    kind,
                    localDate,
                    claimedAt: now,
                })
                .onConflictDoUpdate({
                    target: [
                        adhkarReminderDelivery.subscriptionId,
                        adhkarReminderDelivery.kind,
                        adhkarReminderDelivery.localDate,
                    ],
                    set: { claimedAt: now },
                    setWhere: and(
                        isNull(adhkarReminderDelivery.sentAt),
                        lt(
                            adhkarReminderDelivery.claimedAt,
                            new Date(now.getTime() - 5 * 60_000),
                        ),
                    ),
                })
                .returning();
            if (!claim.length) {
                duplicate++;
                continue;
            }
            const ar = settings.language === "ar";
            try {
                await webpush.sendNotification(
                    {
                        endpoint: subscription.endpoint,
                        keys: {
                            p256dh: subscription.p256dh,
                            auth: subscription.auth,
                        },
                    },
                    JSON.stringify({
                        title: ar
                            ? kind === "morning"
                                ? "حان وقت أذكار الصباح"
                                : "حان وقت أذكار المساء"
                            : kind === "morning"
                              ? "Time for morning adhkar"
                              : "Time for evening adhkar",
                        body: ar
                            ? "خذ لحظات لذكر الله. اضغط لقراءة الأذكار."
                            : "Take a moment for remembrance. Tap to read your adhkar.",
                        url: `/azkar?category=${kind}`,
                        tag: `adhkar-${kind}-${localDate}`,
                    }),
                    { TTL: 10 * 60, urgency: "normal", timeout: 10000 },
                );
            } catch (error) {
                failed++;
                if (isExpiredPushSubscription(error))
                    await db
                        .delete(pushSubscription)
                        .where(eq(pushSubscription.id, subscription.id));
                else
                    await db
                        .delete(adhkarReminderDelivery)
                        .where(
                            and(
                                key,
                                eq(adhkarReminderDelivery.claimedAt, now),
                                isNull(adhkarReminderDelivery.sentAt),
                            ),
                        );
                continue;
            }
            await db
                .update(adhkarReminderDelivery)
                .set({ sentAt: new Date() })
                .where(key);
            sent++;
        }
    }
    return NextResponse.json({ success: true, sent, failed, duplicate });
}
