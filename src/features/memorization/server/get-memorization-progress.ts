import "server-only";

import { asc, eq } from "drizzle-orm";
import db from "@/drizzle/db";
import { userMemorizedHizb } from "@/drizzle/schema";

export default async function getMemorizationProgress(userId: string) {
    const rows = await db
        .select({ hizbNumber: userMemorizedHizb.hizbNumber })
        .from(userMemorizedHizb)
        .where(eq(userMemorizedHizb.userId, userId))
        .orderBy(asc(userMemorizedHizb.hizbNumber));

    return rows.map((row) => row.hizbNumber);
}
