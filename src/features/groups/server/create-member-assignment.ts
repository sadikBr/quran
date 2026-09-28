"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import db from "@/drizzle/db";
import {
    groupMember,
    practiceAssignment,
    userSettings,
} from "@/drizzle/schema";
import { auth } from "@/features/auth/auth";
import { practiceRangeSchema, referenceOrder } from "@/features/practice/types";
import getSurahsMeta from "@/features/quran/server/get-surahs-meta";
import { getWarshChapters } from "@/features/quran/server/get-warsh-mushaf";

const inputSchema = practiceRangeSchema.extend({
    groupId: z.string().min(1),
    assigneeId: z.string().min(1),
    dueDate: z.iso.date(),
    instructions: z.string().trim().max(500).optional(),
});

export default async function createMemberAssignment(input: unknown) {
    const parsed = inputSchema.safeParse(input);
    if (!parsed.success) return { success: false as const, reason: "invalid" };

    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return { success: false as const, reason: "unauthorized" };

    const [adminMembership, assigneeMembership] = await Promise.all([
        db
            .select({ id: groupMember.id })
            .from(groupMember)
            .where(
                and(
                    eq(groupMember.groupId, parsed.data.groupId),
                    eq(groupMember.userId, session.user.id),
                    eq(groupMember.role, "admin"),
                ),
            )
            .limit(1),
        db
            .select({ id: groupMember.id })
            .from(groupMember)
            .where(
                and(
                    eq(groupMember.groupId, parsed.data.groupId),
                    eq(groupMember.userId, parsed.data.assigneeId),
                ),
            )
            .limit(1),
    ]);

    if (!adminMembership[0] || !assigneeMembership[0]) {
        return { success: false as const, reason: "unauthorized" };
    }

    const [settings] = await db
        .select({ riwayah: userSettings.riwayah })
        .from(userSettings)
        .where(eq(userSettings.userId, parsed.data.assigneeId))
        .limit(1);
    const riwayah = settings?.riwayah ?? "hafs";
    const counts = new Map<number, number>();

    if (riwayah === "warsh") {
        const chapters = await getWarshChapters();
        for (const chapter of chapters)
            counts.set(chapter.id, chapter.verses.length);
    } else {
        const surahs = await getSurahsMeta();
        for (const surah of surahs)
            counts.set(surah.number, surah.numberOfAyahs);
    }

    const { start, end } = parsed.data;
    const referencesExist =
        start.ayahNumber <= (counts.get(start.surahNumber) ?? 0) &&
        end.ayahNumber <= (counts.get(end.surahNumber) ?? 0);
    if (!referencesExist || referenceOrder(start) > referenceOrder(end)) {
        return { success: false as const, reason: "invalid_range" };
    }

    try {
        await db.insert(practiceAssignment).values({
            id: crypto.randomUUID(),
            groupId: parsed.data.groupId,
            assigneeId: parsed.data.assigneeId,
            assignedById: session.user.id,
            kind: parsed.data.kind,
            riwayah,
            startSurahNumber: start.surahNumber,
            startAyahNumber: start.ayahNumber,
            endSurahNumber: end.surahNumber,
            endAyahNumber: end.ayahNumber,
            status: "in_progress",
            dueAt: new Date(`${parsed.data.dueDate}T23:59:59.999Z`),
            instructions: parsed.data.instructions || null,
        });
    } catch {
        return { success: false as const, reason: "failed" };
    }

    revalidatePath(`/groups/${parsed.data.groupId}`);
    revalidatePath("/practice");
    revalidatePath("/dashboard");
    return { success: true as const };
}
