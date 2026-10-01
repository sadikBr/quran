import { createHash } from "node:crypto";
import annotations from "../data/warsh-tajweed/annotations.json";
import {
    TAJWEED_RULES,
    type TajweedRule,
    type TajweedSegment,
} from "../helpers/quranpedia-tajweed";

type RecordEntry = { hash: string; spans: [number, number, string[]][] };
const chapters = annotations as unknown as Record<
    string,
    Record<string, RecordEntry>
>;

export function getWarshTajweed(
    surah: number,
    ayah: number,
    text: string,
): TajweedSegment[] | undefined {
    const entry = chapters[String(surah)]?.[String(ayah)];
    // Never reuse offsets against a revised text or another verse/riwayah.
    if (
        !entry ||
        createHash("sha256").update(text).digest("hex") !== entry.hash
    )
        return undefined;
    const chars = Array.from(text);
    const segments: TajweedSegment[] = [];
    let cursor = 0;
    for (const [start, end, rules] of entry.spans) {
        if (
            start < cursor ||
            end <= start ||
            end > chars.length ||
            !rules.length ||
            rules.some((rule) => !Object.hasOwn(TAJWEED_RULES, rule))
        )
            return undefined;
        if (start > cursor)
            segments.push({ text: chars.slice(cursor, start).join("") });
        segments.push({
            text: chars.slice(start, end).join(""),
            rule: rules[0] as TajweedRule,
            rules: rules as TajweedRule[],
        });
        cursor = end;
    }
    if (cursor < chars.length)
        segments.push({ text: chars.slice(cursor).join("") });
    return segments;
}
