import "server-only";

import { and, desc, eq, ilike, isNotNull, isNull, or, sql } from "drizzle-orm";
import db from "@/drizzle/db";
import * as s from "@/drizzle/schema";

export type UserFilter = "all" | "active" | "suspended" | "supervisors";
export type UserAction = "reset" | "suspend" | "reactivate" | "sign_out";
type Reader = Pick<typeof db, "select">;

export const userFields = {
    id: s.user.id,
    name: s.user.name,
    email: s.user.email,
    role: s.user.role,
    createdAt: s.user.createdAt,
    updatedAt: s.user.updatedAt,
    suspendedAt: s.user.suspendedAt,
};

export async function listManagedUsers(
    query: string,
    filter: UserFilter,
    page: number,
) {
    const search = `%${query
        .trim()
        .slice(0, 100)
        .replace(/[\\%_]/g, "\\$&")}%`;
    const where = and(
        eq(s.user.role, "member"),
        query.trim()
            ? or(ilike(s.user.name, search), ilike(s.user.email, search))
            : undefined,
        filter === "active"
            ? isNull(s.user.suspendedAt)
            : filter === "suspended"
              ? isNotNull(s.user.suspendedAt)
              : undefined,
        filter === "supervisors"
            ? sql`exists (select 1 from group_member gm where gm.user_id = ${s.user.id} and gm.role = 'supervisor')`
            : undefined,
    );
    const [users, [summary], [matches]] = await Promise.all([
        db
            .select({
                ...userFields,
                circles: sql<number>`(select count(*)::int from group_member gm where gm.user_id = ${s.user.id})`,
                supervises: sql<boolean>`exists (select 1 from group_member gm where gm.user_id = ${s.user.id} and gm.role = 'supervisor')`,
            })
            .from(s.user)
            .where(where)
            .orderBy(desc(s.user.createdAt), s.user.id)
            .limit(21)
            .offset((page - 1) * 20),
        db
            .select({
                total: sql<number>`count(*)::int`,
                suspended: sql<number>`count(*) filter (where ${s.user.suspendedAt} is not null)::int`,
                supervisors: sql<number>`count(*) filter (where exists (select 1 from group_member gm where gm.user_id = ${s.user.id} and gm.role = 'supervisor'))::int`,
            })
            .from(s.user)
            .where(eq(s.user.role, "member")),
        db
            .select({ count: sql<number>`count(*)::int` })
            .from(s.user)
            .where(where),
    ]);
    return {
        users: users.slice(0, 20),
        hasMore: users.length > 20,
        summary,
        count: matches.count,
    };
}

// Explicit ownership: authored assignments and reviews for other learners are not reset.
// Child rows (sessions, collection links and notification deliveries) cascade from these roots.
export const personalData = [
    {
        key: "memorization",
        tables: [
            s.memorizationMistakeEvent,
            s.memorizationMistake,
            s.memorizationBaselineChange,
            s.memorizationAssessment,
            s.userMemorizedHizb,
            s.memorizationCorrectionRequest,
            s.memorizationRecord,
        ],
    },
    {
        key: "plans",
        tables: [
            s.memorizationSession,
            s.memorizationWeek,
            s.memorizationPlan,
            s.revisionSession,
            s.revisionWeek,
            s.revisionPlan,
            s.learningSchedule,
            s.weeklyPlanning,
            s.recurringPlan,
        ],
    },
    {
        key: "reading",
        tables: [
            s.userReadingProgress,
            s.userWirdHistory,
            s.userWird,
            s.userKhatmahHistory,
            s.userKhatmahPlan,
        ],
    },
    { key: "bookmarks", tables: [s.bookmarkCollection, s.savedAyah] },
    { key: "circles", tables: [s.groupMember] },
    { key: "attendance", tables: [s.groupMeetingAttendance] },
    { key: "preferences", tables: [s.userGuideProgress, s.userSettings] },
    { key: "reminders", tables: [s.pushSubscription] },
    { key: "devices", tables: [s.session] },
] as const;
export type UserDataSummary = Record<
    (typeof personalData)[number]["key"] | "practice",
    number
>;

export async function getUserDataSummary(
    userId: string,
    reader: Reader = db,
): Promise<UserDataSummary> {
    const entries = await Promise.all(
        personalData.map(async (group) => {
            const counts = await Promise.all(
                group.tables.map(async (table) => {
                    const [row] = await reader
                        .select({ count: sql<number>`count(*)::int` })
                        .from(table)
                        .where(eq(table.userId, userId));
                    return row.count;
                }),
            );
            return [group.key, counts.reduce((sum, n) => sum + n, 0)] as const;
        }),
    );
    const [practice] = await reader
        .select({ count: sql<number>`count(*)::int` })
        .from(s.practiceAssignment)
        .where(eq(s.practiceAssignment.assigneeId, userId));
    return {
        ...Object.fromEntries(entries),
        practice: practice.count,
    } as UserDataSummary;
}

export async function getManagedUser(userId: string) {
    const [account] = await db
        .select(userFields)
        .from(s.user)
        .where(eq(s.user.id, userId));
    if (!account) return null;
    const [summary, circles] = await Promise.all([
        getUserDataSummary(userId),
        db
            .select({
                id: s.memorizationGroup.id,
                name: s.memorizationGroup.name,
                role: s.groupMember.role,
                isActive: s.memorizationGroup.isActive,
                adminPage: sql<number>`(select count(*)::int / 20 + 1 from memorization_group c where c.created_at > ${s.memorizationGroup.createdAt} or (c.created_at = ${s.memorizationGroup.createdAt} and c.id < ${s.memorizationGroup.id}))`,
            })
            .from(s.groupMember)
            .innerJoin(
                s.memorizationGroup,
                eq(s.memorizationGroup.id, s.groupMember.groupId),
            )
            .where(eq(s.groupMember.userId, userId))
            .orderBy(s.memorizationGroup.name, s.memorizationGroup.id),
    ]);
    return { account, summary, circles };
}

export async function getUserActivity(page: number, userId?: string) {
    return db
        .select({
            id: s.userAdminActivity.id,
            action: s.userAdminActivity.action,
            reason: s.userAdminActivity.reason,
            targetId: s.userAdminActivity.targetId,
            targetName: s.userAdminActivity.targetName,
            actorName: s.user.name,
            createdAt: s.userAdminActivity.createdAt,
        })
        .from(s.userAdminActivity)
        .innerJoin(s.user, eq(s.user.id, s.userAdminActivity.actorId))
        .where(userId ? eq(s.userAdminActivity.targetId, userId) : undefined)
        .orderBy(
            desc(s.userAdminActivity.createdAt),
            desc(s.userAdminActivity.id),
        )
        .limit(21)
        .offset((page - 1) * 20);
}
