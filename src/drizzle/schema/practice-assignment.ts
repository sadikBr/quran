import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "../helpers";
import { user } from "./auth-schema";

export const practiceAssignment = pgTable(
    "practice_assignment",
    {
        id,
        assigneeId: text("assignee_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        assignedById: text("assigned_by_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        // Reserved for the group feature. Personal practice has no group.
        groupId: text("group_id"),
        kind: text("kind").notNull(),
        riwayah: text("riwayah").notNull(),
        startSurahNumber: integer("start_surah_number").notNull(),
        startAyahNumber: integer("start_ayah_number").notNull(),
        endSurahNumber: integer("end_surah_number").notNull(),
        endAyahNumber: integer("end_ayah_number").notNull(),
        progressSurahNumber: integer("progress_surah_number"),
        progressAyahNumber: integer("progress_ayah_number"),
        status: text("status").notNull().default("in_progress"),
        reviewNote: text("review_note"),
        submittedAt: timestamp("submitted_at", { withTimezone: true }),
        reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
        createdAt,
        updatedAt,
    },
    (table) => [
        index("practice_assignment_assignee_idx").on(
            table.assigneeId,
            table.status,
        ),
        index("practice_assignment_group_idx").on(table.groupId),
    ],
);
