import { relations } from "drizzle-orm";
import { index, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "../helpers";
import { user } from "./auth-schema";

export const memorizationGroup = pgTable(
    "memorization_group",
    {
        id,
        name: text("name").notNull(),
        description: text("description"),
        inviteCode: text("invite_code").notNull(),
        createdById: text("created_by_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        createdAt,
        updatedAt,
    },
    (table) => [
        uniqueIndex("memorization_group_invite_code_idx").on(table.inviteCode),
        index("memorization_group_creator_idx").on(table.createdById),
    ],
);

export const groupMember = pgTable(
    "group_member",
    {
        id,
        groupId: text("group_id")
            .notNull()
            .references(() => memorizationGroup.id, { onDelete: "cascade" }),
        userId: text("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        role: text("role").notNull().default("member"),
        createdAt,
        updatedAt,
    },
    (table) => [
        uniqueIndex("group_member_group_user_idx").on(
            table.groupId,
            table.userId,
        ),
        index("group_member_user_idx").on(table.userId),
    ],
);

export const memorizationGroupRelations = relations(
    memorizationGroup,
    ({ one, many }) => ({
        creator: one(user, {
            fields: [memorizationGroup.createdById],
            references: [user.id],
        }),
        members: many(groupMember),
    }),
);

export const groupMemberRelations = relations(groupMember, ({ one }) => ({
    group: one(memorizationGroup, {
        fields: [groupMember.groupId],
        references: [memorizationGroup.id],
    }),
    user: one(user, {
        fields: [groupMember.userId],
        references: [user.id],
    }),
}));
