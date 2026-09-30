import { and, gt, inArray, lte } from "drizzle-orm";
import { NextResponse } from "next/server";
import { env } from "@/data/env/server";
import db from "@/drizzle/db";
import { practiceAssignment } from "@/drizzle/schema";
import { expireUnsubmittedAssignments } from "@/features/groups/server/expire-unsubmitted-assignments";
import { sendAssignmentNotification } from "@/features/notifications/server/assignment-notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REMINDER_WINDOW_HOURS = 24;

export async function GET(request: Request) {
    if (
        !env.CRON_SECRET ||
        request.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`
    ) {
        return NextResponse.json({ success: false }, { status: 401 });
    }

    const now = new Date();
    const expiration = await expireUnsubmittedAssignments(now);
    const reminderCutoff = new Date(
        now.getTime() + REMINDER_WINDOW_HOURS * 60 * 60 * 1000,
    );
    const assignments = await db
        .select({ id: practiceAssignment.id })
        .from(practiceAssignment)
        .where(
            and(
                inArray(practiceAssignment.status, [
                    "in_progress",
                    "needs_revision",
                    "not_completed",
                ]),
                gt(practiceAssignment.dueAt, now),
                lte(practiceAssignment.dueAt, reminderCutoff),
            ),
        );

    const totals = {
        sent: 0,
        duplicate: 0,
        removed: 0,
        failed: 0,
    };
    for (const assignment of assignments) {
        const result = await sendAssignmentNotification(
            assignment.id,
            "due_soon",
        );
        totals.sent += result.sent;
        totals.duplicate += result.duplicate;
        totals.removed += result.removed;
        totals.failed += result.failed;
    }

    return NextResponse.json({
        success: true,
        assignments: assignments.length,
        expiration,
        ...totals,
    });
}
