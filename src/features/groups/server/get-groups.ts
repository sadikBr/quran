import "server-only";

import { and, asc, count, eq, inArray } from "drizzle-orm";
import db from "@/drizzle/db";
import {
    groupMember,
    memorizationGroup,
    user,
    userSettings,
} from "@/drizzle/schema";
import type { GroupDetails, GroupRole, GroupSummary } from "../types";

export async function getGroupsForUser(
    userId: string,
): Promise<GroupSummary[]> {
    const memberships = await db
        .select({
            id: memorizationGroup.id,
            name: memorizationGroup.name,
            description: memorizationGroup.description,
            role: groupMember.role,
            isReviewer: groupMember.isReviewer,
            reviewerScope: groupMember.reviewerScope,
        })
        .from(groupMember)
        .innerJoin(
            memorizationGroup,
            eq(groupMember.groupId, memorizationGroup.id),
        )
        .where(eq(groupMember.userId, userId))
        .orderBy(asc(memorizationGroup.name));

    if (memberships.length === 0) return [];

    const memberCounts = await db
        .select({
            groupId: groupMember.groupId,
            value: count(groupMember.id),
        })
        .from(groupMember)
        .where(
            inArray(
                groupMember.groupId,
                memberships.map((membership) => membership.id),
            ),
        )
        .groupBy(groupMember.groupId);
    const counts = new Map(
        memberCounts.map((entry) => [entry.groupId, entry.value]),
    );

    return memberships.map((membership) => ({
        ...membership,
        role: membership.role as GroupRole,
        memberCount: counts.get(membership.id) ?? 0,
    }));
}

export async function getGroupForUser(
    groupId: string,
    userId: string,
): Promise<GroupDetails | null> {
    const [membership] = await db
        .select({
            id: memorizationGroup.id,
            name: memorizationGroup.name,
            description: memorizationGroup.description,
            inviteCode: memorizationGroup.inviteCode,
            createdById: memorizationGroup.createdById,
            role: groupMember.role,
            isReviewer: groupMember.isReviewer,
            reviewerScope: groupMember.reviewerScope,
        })
        .from(groupMember)
        .innerJoin(
            memorizationGroup,
            eq(groupMember.groupId, memorizationGroup.id),
        )
        .where(
            and(
                eq(groupMember.groupId, groupId),
                eq(groupMember.userId, userId),
            ),
        );

    if (!membership) return null;

    const members = await db
        .select({
            id: groupMember.id,
            userId: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
            role: groupMember.role,
            isReviewer: groupMember.isReviewer,
            reviewerScope: groupMember.reviewerScope,
            riwayah: userSettings.riwayah,
            joinedAt: groupMember.createdAt,
        })
        .from(groupMember)
        .innerJoin(user, eq(groupMember.userId, user.id))
        .leftJoin(userSettings, eq(groupMember.userId, userSettings.userId))
        .where(eq(groupMember.groupId, groupId))
        .orderBy(asc(user.name));

    const exactMembership = members.find((member) => member.userId === userId);
    if (!exactMembership) return null;

    return {
        ...membership,
        role: exactMembership.role as GroupRole,
        isReviewer: exactMembership.isReviewer,
        reviewerScope: exactMembership.reviewerScope,
        memberCount: members.length,
        members: members.map((member) => ({
            ...member,
            role: member.role as GroupRole,
            riwayah: member.riwayah ?? "hafs",
        })),
    };
}
