import { expect, test } from "bun:test";
import { carryForwardSessions } from "../src/features/learning/carry-forward";
import {
    generateMemorizationSchedule,
    memorizedAtoms,
} from "../src/features/learning/schedule";
import {
    generateLimitedMemorizationSchedule,
    memorizationCapacity,
    memorizationUsage,
} from "../src/features/learning/weekly-capacity";

const verses = Array.from({ length: 24 }, (_, i) => ({
    surahNumber: 2,
    ayahNumber: i + 1,
    quarter: Math.floor(i / 8) + 1,
    hizb: 1,
    page: 1,
    atoms: [`a${i + 1}`],
}));
const catalogue = { hafs: verses, warsh: verses };
const settings = {
    quartersPerWeek: 1,
    startQuarter: 1,
    direction: "forward",
    timezone: "Africa/Casablanca",
    riwayah: "hafs",
};
const event = (start, end, date, extra = {}) => ({
    id: crypto.randomUUID(),
    method: "self",
    outcome: "confirmed",
    riwayah: "hafs",
    startSurahNumber: 2,
    startAyahNumber: start,
    endSurahNumber: 2,
    endAyahNumber: end,
    createdAt: new Date(date),
    ...extra,
});
const generate = (events, extra = {}) =>
    generateLimitedMemorizationSchedule({
        catalogue,
        settings,
        days: [1, 4],
        fromDate: "2026-10-05",
        covered: memorizedAtoms(catalogue, "hafs", [], events),
        usage: memorizationUsage(
            catalogue,
            "hafs",
            settings.timezone,
            new Set(),
            events,
        ),
        ...extra,
    });

test("finishing a carried quarter consumes this week's slot; no new quarter until next week", () => {
    const events = [
        event(1, 4, "2026-10-01T12:00:00Z"),
        event(5, 8, "2026-10-05T12:00:00Z"),
    ];
    const result = generate(events, { fromDate: "2026-10-06" });
    expect(result.weekStart).toBe("2026-10-12");
    expect(result.sessions.map((s) => s.scheduledDate)).toEqual([
        "2026-10-12",
        "2026-10-15",
    ]);
    expect(result.sessions.flatMap((s) => s.quarters)).toEqual([2, 2]);
});

test("remaining capacity admits only one more quarter when the weekly limit is two", () => {
    const result = generate([event(1, 8, "2026-10-05T12:00:00Z")], {
        settings: { ...settings, quartersPerWeek: 2 },
        fromDate: "2026-10-06",
    });
    expect(result.weekStart).toBe("2026-10-05");
    expect(result.sessions.flatMap((s) => s.quarters)).toEqual([2]);
});

test("lowering the limit below existing confirmations defers unfinished quarters consistently", () => {
    const events = [event(1, 9, "2026-10-05T12:00:00Z")];
    const result = generate(events, { fromDate: "2026-10-06" });
    expect(result.weekStart).toBe("2026-10-12");
    expect(result.sessions.flatMap((s) => s.quarters)).toEqual([2, 2]);
});

test("a partially confirmed quarter can finish this week without opening another quarter", () => {
    const result = generate([event(1, 4, "2026-10-05T12:00:00Z")], {
        fromDate: "2026-10-06",
    });
    expect(result.sessions).toHaveLength(1);
    expect(result.sessions[0]).toMatchObject({
        startAyahNumber: 5,
        endAyahNumber: 8,
        scheduledDate: "2026-10-08",
    });
});

test("baseline and repeated revision do not consume slots; new circle coverage does", () => {
    const events = [
        event(1, 2, "2026-09-28T12:00:00Z"),
        event(1, 2, "2026-10-05T12:00:00Z", { method: "peer" }),
        event(17, 24, "2026-10-05T12:00:00Z"),
        event(9, 12, "2026-10-06T12:00:00Z", { method: "peer" }),
        event(11, 16, "2026-10-07T12:00:00Z", { method: "peer" }),
        event(3, 8, "2026-10-08T12:00:00Z", { outcome: "needs_revision" }),
    ];
    const baseline = new Set(verses.slice(16).flatMap((v) => v.atoms));
    const usage = memorizationUsage(
        catalogue,
        "hafs",
        settings.timezone,
        baseline,
        events.reverse(),
    );
    expect([...usage.get("2026-09-28")]).toEqual([1]);
    expect([...usage.get("2026-10-05")]).toEqual([2]);
    expect(baseline.size).toBe(8);
});

test("usage follows the local Monday boundary and maps cross-reading atoms to native quarters", () => {
    const split = {
        hafs: verses,
        warsh: [{ ...verses[0], atoms: ["a8", "a9"] }],
    };
    const events = [event(1, 1, "2026-10-04T23:30:00Z", { riwayah: "warsh" })];
    const local = memorizationUsage(
        split,
        "hafs",
        "Africa/Casablanca",
        new Set(),
        events,
    );
    expect([...local.get("2026-10-05")]).toEqual([1, 2]);
    const utc = memorizationUsage(split, "hafs", "UTC", new Set(), events);
    expect([...utc.get("2026-09-28")]).toEqual([1, 2]);
});

const portions = [
    {
        id: "a",
        scheduledDate: "2026-09-28",
        done: false,
        completedAt: null,
        remaining: ["2:1", "2:2", "2:3", "2:4"],
        progressAyahNumber: 2,
    },
    {
        id: "b",
        scheduledDate: "2026-10-01",
        done: false,
        completedAt: null,
        remaining: ["2:5", "2:6", "2:7", "2:8"],
        progressAyahNumber: null,
    },
];
const carry = (usage, today = "2026-10-05", days = [1, 4], rows = portions) =>
    carryForwardSessions(
        rows,
        today,
        days,
        settings.timezone,
        [1, 4],
        memorizationCapacity(usage, verses, settings.timezone, 1),
    );

test("a completely missed week carries the same portions once, without adding another target", () => {
    const result = carry(new Map());
    expect(
        result.map((s) => [
            s.id,
            s.scheduledDate,
            s.remaining,
            s.progressAyahNumber,
        ]),
    ).toEqual([
        ["a", "2026-10-05", portions[0].remaining, 2],
        ["b", "2026-10-08", portions[1].remaining, null],
    ]);
    const later = carry(new Map(), "2026-10-19");
    expect(later.map((s) => s.scheduledDate)).toEqual([
        "2026-10-19",
        "2026-10-22",
    ]);
    expect(portions[0].scheduledDate).toBe("2026-09-28");
});

test("full weekly allowance defers existing portions even when study days change", () => {
    const usage = new Map([["2026-10-05", new Set([2])]]);
    const result = carry(usage, "2026-10-05", [2, 5]);
    expect(result.map((s) => s.scheduledDate)).toEqual([
        "2026-10-13",
        "2026-10-16",
    ]);
    expect([...usage.get("2026-10-05")]).toEqual([2]);
    expect(carry(usage, "2026-10-05", []).map((s) => s.scheduledDate)).toEqual([
        null,
        null,
    ]);
});

test("separate batches from the same quarter count once, but the next quarter waits", () => {
    const rows = [
        ...portions,
        {
            ...portions[1],
            id: "c",
            scheduledDate: "2026-10-02",
            remaining: ["2:9"],
        },
    ];
    expect(
        carry(new Map(), "2026-10-05", [1, 2, 4], rows).map(
            (s) => s.scheduledDate,
        ),
    ).toEqual(["2026-10-05", "2026-10-06", "2026-10-12"]);
});

test("the cap also holds for reverse order, exhausted material and empty study days", () => {
    const args = {
        catalogue,
        settings: {
            ...settings,
            direction: "backward",
            startQuarter: 3,
            quartersPerWeek: 2,
        },
        days: [1],
        covered: new Set(verses.slice(16).flatMap((v) => v.atoms)),
        weekStart: "2026-10-05",
        fromDate: "2026-10-05",
        usedQuarters: new Set([3]),
    };
    expect(
        generateMemorizationSchedule(args).flatMap((s) => s.quarters),
    ).toEqual([2]);
    expect(generate([], { days: [] }).sessions).toEqual([]);
    const all = [event(1, 24, "2026-10-05T12:00:00Z")];
    expect(generate(all).sessions).toEqual([]);
});
