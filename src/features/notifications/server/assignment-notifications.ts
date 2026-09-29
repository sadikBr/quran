import "server-only";

import { and, eq } from "drizzle-orm";
import webpush from "web-push";
import db from "@/drizzle/db";
import {
    assignmentNotificationDelivery,
    groupMember,
    memorizationGroup,
    practiceAssignment,
    pushSubscription,
    userSettings,
} from "@/drizzle/schema";
import { configureWebPush, isExpiredPushSubscription } from "./web-push";

export type AssignmentNotificationKind =
    | "published"
    | "due_soon"
    | "review_completed"
    | "review_needs_revision";

function shortenedFeedback(note: string | null) {
    if (!note) return null;
    return note.length > 100 ? `${note.slice(0, 97).trimEnd()}…` : note;
}

function notificationCopy({
    language,
    kind,
    assignmentKind,
    groupName,
    dueAt,
    reviewNote,
}: {
    language: "ar" | "en";
    kind: AssignmentNotificationKind;
    assignmentKind: string;
    groupName: string;
    dueAt: Date | null;
    reviewNote: string | null;
}) {
    const feedback = shortenedFeedback(reviewNote);

    if (language === "ar") {
        if (kind === "review_completed") {
            return {
                title: "اعتُمد إنجاز تكليفك",
                body: feedback
                    ? `اعتمد مشرف حلقة «${groupName}» إنجازك. ملاحظته: ${feedback}`
                    : `أحسنت! اعتمد مشرف حلقة «${groupName}» إنجاز تكليفك.`,
            };
        }

        if (kind === "review_needs_revision") {
            return {
                title: "يحتاج تكليفك إلى مزيد من المراجعة",
                body: feedback
                    ? `أعاد إليك مشرف حلقة «${groupName}» التكليف. ملاحظته: ${feedback}`
                    : `طلب منك مشرف حلقة «${groupName}» مراجعة التكليف مرة أخرى.`,
            };
        }

        if (kind === "due_soon") {
            return {
                title: "موعد تكليفك يقترب",
                body: `بقيت 24 ساعة على موعد تكليفك من حلقة «${groupName}».`,
            };
        }

        const type = assignmentKind === "memorization" ? "حفظ جديد" : "مراجعة";
        const due = dueAt
            ? new Intl.DateTimeFormat("ar", {
                  month: "long",
                  day: "numeric",
                  timeZone: "UTC",
              }).format(dueAt)
            : null;
        return {
            title: "لديك تكليف جديد",
            body: due
                ? `أرسلت إليك حلقة «${groupName}» تكليف ${type}، وموعده ${due}.`
                : `أرسلت إليك حلقة «${groupName}» تكليف ${type} جديدًا.`,
        };
    }

    if (kind === "review_completed") {
        return {
            title: "Your assignment was approved",
            body: feedback
                ? `${groupName} approved your work. Feedback: ${feedback}`
                : `Well done! ${groupName} approved your assignment.`,
        };
    }

    if (kind === "review_needs_revision") {
        return {
            title: "Your assignment needs more revision",
            body: feedback
                ? `${groupName} returned your assignment. Feedback: ${feedback}`
                : `${groupName} asked you to review this assignment again.`,
        };
    }

    if (kind === "due_soon") {
        return {
            title: "Your assignment is due soon",
            body: `Your assignment from ${groupName} is due in 24 hours.`,
        };
    }

    const type =
        assignmentKind === "memorization" ? "memorization" : "revision";
    const due = dueAt
        ? new Intl.DateTimeFormat("en", {
              month: "long",
              day: "numeric",
              timeZone: "UTC",
          }).format(dueAt)
        : null;
    return {
        title: "You have a new assignment",
        body: due
            ? `${groupName} assigned you new ${type} work, due ${due}.`
            : `${groupName} assigned you new ${type} work.`,
    };
}

export async function sendAssignmentNotification(
    assignmentId: string,
    kind: AssignmentNotificationKind,
) {
    if (!configureWebPush()) {
        return { sent: 0, duplicate: 0, removed: 0, failed: 0 };
    }

    const [assignment] = await db
        .select({
            id: practiceAssignment.id,
            groupId: practiceAssignment.groupId,
            assigneeId: practiceAssignment.assigneeId,
            assignmentKind: practiceAssignment.kind,
            dueAt: practiceAssignment.dueAt,
            status: practiceAssignment.status,
            reviewNote: practiceAssignment.reviewNote,
            reviewedAt: practiceAssignment.reviewedAt,
            groupName: memorizationGroup.name,
            language: userSettings.language,
            remindersEnabled: userSettings.assignmentRemindersEnabled,
            assigneeRole: groupMember.role,
        })
        .from(practiceAssignment)
        .leftJoin(
            memorizationGroup,
            eq(practiceAssignment.groupId, memorizationGroup.id),
        )
        .leftJoin(
            userSettings,
            eq(practiceAssignment.assigneeId, userSettings.userId),
        )
        .leftJoin(
            groupMember,
            and(
                eq(groupMember.groupId, practiceAssignment.groupId),
                eq(groupMember.userId, practiceAssignment.assigneeId),
            ),
        )
        .where(eq(practiceAssignment.id, assignmentId))
        .limit(1);

    const reviewCompleted = kind === "review_completed";
    const reviewNeedsRevision = kind === "review_needs_revision";
    const reviewKind = reviewCompleted || reviewNeedsRevision;
    const statusMatchesReview =
        (reviewCompleted && assignment?.status === "completed") ||
        (reviewNeedsRevision && assignment?.status === "needs_revision");

    if (
        !assignment ||
        !assignment.groupName ||
        assignment.assigneeRole === "supervisor" ||
        assignment.remindersEnabled === false ||
        assignment.status === "draft" ||
        (reviewKind && !statusMatchesReview) ||
        (!reviewKind && assignment.status === "completed") ||
        (kind === "due_soon" && assignment.status === "submitted")
    ) {
        return { sent: 0, duplicate: 0, removed: 0, failed: 0 };
    }

    const subscriptions = await db
        .select({
            id: pushSubscription.id,
            endpoint: pushSubscription.endpoint,
            p256dh: pushSubscription.p256dh,
            auth: pushSubscription.auth,
        })
        .from(pushSubscription)
        .where(eq(pushSubscription.userId, assignment.assigneeId));

    const copy = notificationCopy({
        language: assignment.language ?? "en",
        kind,
        assignmentKind: assignment.assignmentKind,
        groupName: assignment.groupName,
        dueAt: assignment.dueAt,
        reviewNote: assignment.reviewNote,
    });
    const deliveryKind = reviewKind
        ? `${kind}:${assignment.reviewedAt?.toISOString() ?? "latest"}`
        : kind === "due_soon" && assignment.reviewedAt && assignment.dueAt
          ? `${kind}:${assignment.dueAt.toISOString()}`
          : kind;
    const destination = reviewCompleted
        ? assignment.groupId
            ? `/assignments?group=${assignment.groupId}`
            : "/assignments"
        : `/practice/${assignment.id}/read`;
    let sent = 0;
    let duplicate = 0;
    let removed = 0;
    let failed = 0;

    for (const subscription of subscriptions) {
        const deliveryId = crypto.randomUUID();
        const reserved = await db
            .insert(assignmentNotificationDelivery)
            .values({
                id: deliveryId,
                assignmentId: assignment.id,
                subscriptionId: subscription.id,
                kind: deliveryKind,
            })
            .onConflictDoNothing()
            .returning({ id: assignmentNotificationDelivery.id });

        if (reserved.length === 0) {
            duplicate += 1;
            continue;
        }

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
                    url: destination,
                    tag: `assignment-${deliveryKind}-${assignment.id}`,
                }),
                {
                    TTL: kind === "due_soon" ? 60 * 60 : 24 * 60 * 60,
                },
            );
            await db
                .update(assignmentNotificationDelivery)
                .set({ sentAt: new Date() })
                .where(eq(assignmentNotificationDelivery.id, deliveryId));
            sent += 1;
        } catch (error) {
            if (isExpiredPushSubscription(error)) {
                await db
                    .delete(pushSubscription)
                    .where(eq(pushSubscription.id, subscription.id));
                removed += 1;
                continue;
            }

            await db
                .delete(assignmentNotificationDelivery)
                .where(eq(assignmentNotificationDelivery.id, deliveryId));
            failed += 1;
        }
    }

    return { sent, duplicate, removed, failed };
}
