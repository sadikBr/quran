import "server-only";

import { type SQLWrapper, sql } from "drizzle-orm";
import { memorizationGroup } from "@/drizzle/schema";

/** Use in writes too, so stale tabs cannot continue an inactive workflow. */
export function activeGroup(groupId: SQLWrapper | string) {
    return sql`exists (select 1 from ${memorizationGroup} where ${memorizationGroup.id} = ${groupId} and ${memorizationGroup.isActive} = true)`;
}

/** Preparation and paused occurrences must never produce attendance penalties. */
export function activeGroupOccurrence(
    groupId: SQLWrapper | string,
    startsAt: SQLWrapper,
) {
    return sql`exists (select 1 from ${memorizationGroup} where ${memorizationGroup.id} = ${groupId} and ${memorizationGroup.isActive} = true and (${memorizationGroup.activeSince} is null or ${startsAt} >= ${memorizationGroup.activeSince}))`;
}
