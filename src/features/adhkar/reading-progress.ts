import type { AdhkarEntry } from "./types";

/** Legacy progress used the unsplit Hisn IDs and a positional cursor. */
export function restoreReadingProgress(
    entries: AdhkarEntry[],
    saved: unknown,
    day: string,
    legacyFirstId: number,
) {
    const empty = { index: 0, read: [] as number[] };
    if (!saved || typeof saved !== "object") return empty;
    const value = saved as Record<string, unknown>;
    if (value.day !== day) return empty;
    const completed = Array.isArray(value.read) ? value.read : [];
    const legacy = value.version !== 2;
    const read = entries
        .filter((item) => completed.includes(legacy ? item.sourceId : item.ID))
        .map((item) => item.ID);
    const legacyId =
        typeof value.index === "number" &&
        Number.isInteger(value.index) &&
        value.index >= 0
            ? legacyFirstId + value.index
            : null;
    const index = entries.findIndex((item) =>
        legacy ? item.sourceId === legacyId : item.ID === value.currentId,
    );
    return {
        read,
        index:
            index >= 0
                ? index
                : Math.max(
                      0,
                      entries.findIndex((item) => !read.includes(item.ID)),
                  ),
    };
}
