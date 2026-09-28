import { relations } from "drizzle-orm";
import {
    foreignKey,
    index,
    integer,
    pgTable,
    primaryKey,
    text,
    uniqueIndex,
} from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "../helpers";
import { user } from "./auth-schema";
import { savedAyah } from "./saved-ayah";

export const bookmarkCollection = pgTable(
    "bookmark_collection",
    {
        id,
        userId: text("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        name: text("name").notNull(),
        nameKey: text("name_key").notNull(),
        createdAt,
        updatedAt,
    },
    (table) => [
        uniqueIndex("bookmark_collection_user_name_idx").on(
            table.userId,
            table.nameKey,
        ),
        index("bookmark_collection_user_idx").on(table.userId),
    ],
);

export const savedAyahCollection = pgTable(
    "saved_ayah_collection",
    {
        userId: text("user_id").notNull(),
        globalAyahNumber: integer("global_ayah_number").notNull(),
        collectionId: text("collection_id")
            .notNull()
            .references(() => bookmarkCollection.id, { onDelete: "cascade" }),
        createdAt,
    },
    (table) => [
        primaryKey({
            columns: [table.userId, table.globalAyahNumber, table.collectionId],
        }),
        foreignKey({
            columns: [table.userId, table.globalAyahNumber],
            foreignColumns: [savedAyah.userId, savedAyah.globalAyahNumber],
            name: "saved_ayah_collection_ayah_fk",
        }).onDelete("cascade"),
        index("saved_ayah_collection_collection_idx").on(table.collectionId),
    ],
);

export const bookmarkCollectionRelations = relations(
    bookmarkCollection,
    ({ one, many }) => ({
        user: one(user, {
            fields: [bookmarkCollection.userId],
            references: [user.id],
        }),
        ayahs: many(savedAyahCollection),
    }),
);

export const savedAyahCollectionRelations = relations(
    savedAyahCollection,
    ({ one }) => ({
        collection: one(bookmarkCollection, {
            fields: [savedAyahCollection.collectionId],
            references: [bookmarkCollection.id],
        }),
        ayah: one(savedAyah, {
            fields: [
                savedAyahCollection.userId,
                savedAyahCollection.globalAyahNumber,
            ],
            references: [savedAyah.userId, savedAyah.globalAyahNumber],
        }),
    }),
);
