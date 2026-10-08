import { NextResponse } from "next/server";
import { env } from "@/data/env/server";
import { configureWebPush } from "@/features/notifications/server/web-push";
import { sendRecurringReminders } from "@/features/plans/server/reminders";

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
            { success: false, reason: "Push is not configured." },
            { status: 503 },
        );
    return NextResponse.json({
        success: true,
        ...(await sendRecurringReminders()),
    });
}
