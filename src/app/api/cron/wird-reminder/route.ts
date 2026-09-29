import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import webpush from "web-push";
import { env } from "@/data/env/server";
import db from "@/drizzle/db";
import { pushSubscription, userSettings, userWird } from "@/drizzle/schema";
import {
    configureWebPush,
    isExpiredPushSubscription,
} from "@/features/notifications/server/web-push";
import getWirdDate from "@/features/wird/server/wird-date";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WIRD_TIME_ZONE = "Africa/Casablanca";

function casablancaHour(value: Date) {
    return new Intl.DateTimeFormat("en-GB", {
        timeZone: WIRD_TIME_ZONE,
        hour: "2-digit",
        hourCycle: "h23",
    }).format(value);
}

function notificationCopy(language: "ar" | "en") {
    return language === "ar"
        ? {
              title: "وردك اليومي بانتظارك",
              body: "بقيت ساعة على انتهاء اليوم. أتمم وردك الآن لتحافظ على مداومتك.",
          }
        : {
              title: "Your daily Wird is waiting",
              body: "The day is almost over. Complete your Wird now to preserve your streak.",
          };
}

export async function GET(request: Request) {
    if (
        !env.CRON_SECRET ||
        request.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`
    ) {
        return NextResponse.json({ success: false }, { status: 401 });
    }
    if (!configureWebPush()) {
        return NextResponse.json(
            { success: false, reason: "Push is not configured." },
            { status: 503 },
        );
    }

    const now = new Date();
    if (casablancaHour(now) !== "23") {
        return NextResponse.json({ success: true, skipped: "outside-window" });
    }

    const today = getWirdDate(now);
    const subscriptions = await db
        .select({
            id: pushSubscription.id,
            endpoint: pushSubscription.endpoint,
            p256dh: pushSubscription.p256dh,
            auth: pushSubscription.auth,
            lastReminderDate: pushSubscription.lastWirdReminderDate,
            language: userSettings.language,
            targetDate: userWird.targetDate,
            completedAt: userWird.completedAt,
            remindersEnabled: userSettings.wirdRemindersEnabled,
        })
        .from(pushSubscription)
        .innerJoin(userWird, eq(pushSubscription.userId, userWird.userId))
        .innerJoin(
            userSettings,
            eq(pushSubscription.userId, userSettings.userId),
        );

    let sent = 0;
    let removed = 0;

    for (const subscription of subscriptions) {
        const completedToday =
            subscription.completedAt !== null &&
            getWirdDate(subscription.completedAt) === today;
        if (
            !subscription.remindersEnabled ||
            completedToday ||
            subscription.targetDate > today ||
            subscription.lastReminderDate === today
        ) {
            continue;
        }

        const copy = notificationCopy(subscription.language);
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
                    ...copy,
                    url: "/wird/read",
                    tag: `wird-reminder-${today}`,
                }),
                { TTL: 60 * 60, urgency: "high" },
            );
            await db
                .update(pushSubscription)
                .set({ lastWirdReminderDate: today })
                .where(eq(pushSubscription.id, subscription.id));
            sent += 1;
        } catch (error) {
            if (!isExpiredPushSubscription(error)) continue;
            await db
                .delete(pushSubscription)
                .where(eq(pushSubscription.id, subscription.id));
            removed += 1;
        }
    }

    return NextResponse.json({ success: true, sent, removed });
}
