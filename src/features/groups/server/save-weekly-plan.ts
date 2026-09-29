"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { after } from "next/server";
import { z } from "zod";
import db from "@/drizzle/db";
import {
    groupMember,
    practiceAssignment,
    userSettings,
} from "@/drizzle/schema";
import { auth } from "@/features/auth/auth";
import { sendAssignmentNotification } from "@/features/notifications/server/assignment-notifications";
import {
    PRACTICE_KINDS,
    quranReferenceSchema,
    referenceOrder,
} from "@/features/practice/types";
import getSurahsMeta from "@/features/quran/server/get-surahs-meta";
import { getWarshChapters } from "@/features/quran/server/get-warsh-mushaf";

const entrySchema = z.object({
    assigneeId: z.string().min(1),
    kind: z.enum(PRACTICE_KINDS),
    start: quranReferenceSchema,
    end: quranReferenceSchema,
    instructions: z.string().trim().max(500).optional(),
});

const inputSchema = z.object({
    groupId: z.string().min(1),
    dueDate: z.iso.date(),
    mode: z.enum(["draft", "publish"]),
    entries: z.array(entrySchema).min(1).max(100),
});

export default async function saveWeeklyPlan(input: unknown) {
    const parsed = inputSchema.safeParse(input);
    if (!parsed.success) return { success: false as const, reason: "invalid" };

    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return { success: false as const, reason: "unauthorized" };

    const memberships = await db
        .select({
            userId: groupMember.userId,
            role: groupMember.role,
            riwayah: userSettings.riwayah,
        })
        .from(groupMember)
        .leftJoin(userSettings, eq(groupMember.userId, userSettings.userId))
        .where(eq(groupMember.groupId, parsed.data.groupId));
    const admin = memberships.find(
        (member) =>
            member.userId === session.user.id && member.role === "admin",
    );
    if (!admin) return { success: false as const, reason: "unauthorized" };

    const memberById = new Map(
        memberships.map((member) => [
            member.userId,
            { riwayah: member.riwayah === "warsh" ? "warsh" : "hafs" },
        ]),
    );
    const uniqueAssignees = new Set(
        parsed.data.entries.map((entry) => entry.assigneeId),
    );
    if (
        uniqueAssignees.size !== parsed.data.entries.length ||
        parsed.data.entries.some((entry) => !memberById.has(entry.assigneeId))
    ) {
        return { success: false as const, reason: "invalid_members" };
    }

    const needsWarsh = parsed.data.entries.some(
        (entry) => memberById.get(entry.assigneeId)?.riwayah === "warsh",
    );
    const needsHafs = parsed.data.entries.some(
        (entry) => memberById.get(entry.assigneeId)?.riwayah !== "warsh",
    );
    const [hafsSurahs, warshChapters] = await Promise.all([
        needsHafs ? getSurahsMeta() : Promise.resolve([]),
        needsWarsh ? getWarshChapters() : Promise.resolve([]),
    ]);
    const hafsCounts = new Map(
        hafsSurahs.map((surah) => [surah.number, surah.numberOfAyahs]),
    );
    const warshCounts = new Map(
        warshChapters.map((chapter) => [chapter.id, chapter.verses.length]),
    );

    const invalidRange = parsed.data.entries.some((entry) => {
        const counts =
            memberById.get(entry.assigneeId)?.riwayah === "warsh"
                ? warshCounts
                : hafsCounts;
        return (
            entry.start.ayahNumber >
                (counts.get(entry.start.surahNumber) ?? 0) ||
            entry.end.ayahNumber > (counts.get(entry.end.surahNumber) ?? 0) ||
            referenceOrder(entry.start) > referenceOrder(entry.end)
        );
    });
    if (invalidRange)
        return { success: false as const, reason: "invalid_range" };

    const dueAt = new Date(`${parsed.data.dueDate}T12:00:00.000Z`);
    const assignments = parsed.data.entries.map((entry) => {
        const riwayah = memberById.get(entry.assigneeId)?.riwayah ?? "hafs";
        return {
            id: crypto.randomUUID(),
            groupId: parsed.data.groupId,
            assigneeId: entry.assigneeId,
            assignedById: session.user.id,
            kind: entry.kind,
            riwayah,
            startSurahNumber: entry.start.surahNumber,
            startAyahNumber: entry.start.ayahNumber,
            endSurahNumber: entry.end.surahNumber,
            endAyahNumber: entry.end.ayahNumber,
            status: parsed.data.mode === "draft" ? "draft" : "in_progress",
            dueAt,
            instructions: entry.instructions || null,
        };
    });
    try {
        await db.transaction(async (transaction) => {
            await transaction
                .delete(practiceAssignment)
                .where(
                    and(
                        eq(practiceAssignment.groupId, parsed.data.groupId),
                        eq(practiceAssignment.status, "draft"),
                    ),
                );

            await transaction.insert(practiceAssignment).values(assignments);
        });
    } catch {
        return { success: false as const, reason: "failed" };
    }

    if (parsed.data.mode === "publish") {
        after(async () => {
            await Promise.allSettled(
                assignments.map((assignment) =>
                    sendAssignmentNotification(assignment.id, "published"),
                ),
            );
        });
    }

    revalidatePath(`/groups/${parsed.data.groupId}`);
    revalidatePath(`/groups/${parsed.data.groupId}/plan`);
    revalidatePath("/weekly");
    revalidatePath("/practice");
    revalidatePath("/dashboard");
    return { success: true as const, mode: parsed.data.mode };
}
