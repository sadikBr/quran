import { expect, test } from "bun:test";
import {
    connectingVerses,
    learningActivity,
    weeklyLearningSummary,
} from "../src/features/retention/activity";
import { refreshFollowUpSessions } from "../src/features/retention/follow-up-plan";
import {
    differingWords,
    memorizedSimilarReferences,
    opening,
} from "../src/features/retention/similar";
import {
    generateRevisionSchedule,
    revisionCoverage,
    weekPeerAtoms,
} from "../src/features/revision/schedule";

const verses = Array.from({ length: 40 }, (_, i) => ({
    surahNumber: 2,
    ayahNumber: i + 1,
    quarter: Math.floor(i / 2) + 1,
    hizb: Math.floor(i / 8) + 1,
    page: 1,
    atoms: [`a${i + 1}`],
}));
const catalogue = { hafs: verses, warsh: verses.map((v) => ({ ...v })) };
const settings = {
    days: [1, 2, 3, 4],
    quartersPerDay: 1,
    timezone: "UTC",
    riwayah: "hafs",
    reminderTime: null,
};
const allKnown = new Set(verses.flatMap((v) => v.atoms));
const assessment = (id, at, start = 19, end = 20, extra = {}) => ({
    id,
    createdAt: new Date(at),
    startSurahNumber: 2,
    startAyahNumber: start,
    endSurahNumber: 2,
    endAyahNumber: end,
    riwayah: "hafs",
    method: "self",
    outcome: "confirmed",
    ...extra,
});
const activity = (assessments, extra = {}) =>
    learningActivity({
        catalogue,
        baselineRiwayah: "hafs",
        baselineEvents: [],
        assessments,
        timezone: "UTC",
        now: new Date("2026-11-01T12:00:00Z"),
        ...extra,
    });
const schedule = (extra = {}) =>
    generateRevisionSchedule({
        catalogue,
        settings,
        covered: allKnown,
        completedHizbs: [],
        assessments: [],
        history: [],
        weekStart: "2026-10-05",
        fromDate: "2026-10-05",
        ...extra,
    });
const saved = (ranges) =>
    ranges.map((r, i) => ({
        ...r,
        id: `s${i}`,
        completedAt: null,
        progressSurahNumber: null,
        progressAyahNumber: null,
        projectedDate: r.scheduledDate,
        done: false,
    }));
const repair = (sessions, followUps, extra = {}) =>
    refreshFollowUpSessions({
        catalogue,
        settings,
        sessions,
        covered: allKnown,
        assessments: [],
        history: [],
        followUps,
        ...extra,
    });

test("new memorization earns three spaced follow-ups from actual successful review dates", () => {
    const events = [assessment("learn", "2026-10-05T10:00:00Z")];
    expect(activity(events).followUps.get("a19")).toEqual({
        stage: 0,
        due: "2026-10-06",
    });
    events.push(assessment("early", "2026-10-05T15:00:00Z"));
    expect(activity(events).followUps.get("a19").stage).toBe(0);
    events.push(assessment("first", "2026-10-07T12:00:00Z"));
    expect(activity(events).followUps.get("a19")).toEqual({
        stage: 1,
        due: "2026-10-10",
    });
    events.push(assessment("duplicate-day", "2026-10-07T15:00:00Z"));
    expect(activity(events).followUps.get("a19").stage).toBe(1);
    events.push(assessment("second", "2026-10-10T12:00:00Z"));
    expect(activity(events).followUps.get("a19")).toEqual({
        stage: 2,
        due: "2026-10-17",
    });
    events.push(assessment("third", "2026-10-17T12:00:00Z"));
    expect(activity(events).followUps.size).toBe(0);
});

test("difficult reviews return sooner without advancing the consolidation stage", () => {
    const result = activity([
        assessment("learn", "2026-10-05T10:00:00Z"),
        assessment("one", "2026-10-06T10:00:00Z"),
        assessment("hard", "2026-10-07T10:00:00Z", 19, 20, {
            outcome: "needs_revision",
        }),
    ]);
    expect(result.followUps.get("a19")).toEqual({
        stage: 1,
        due: "2026-10-08",
    });
});

test("baseline corrections neither become learning nor rewrite earlier weekly results", () => {
    const result = activity(
        [
            assessment("review", "2026-10-06T10:00:00Z", 1, 2),
            assessment("learn", "2026-10-06T11:00:00Z", 19, 20),
        ],
        {
            baselineEvents: [
                {
                    id: "setup",
                    createdAt: new Date("2026-10-01T00:00:00Z"),
                    hizbs: [1],
                    ranges: [],
                },
                {
                    id: "correction",
                    createdAt: new Date("2026-10-15T00:00:00Z"),
                    hizbs: [3],
                    ranges: [],
                },
            ],
        },
    );
    expect(result.followUps.has("a1")).toBe(false);
    expect(result.followUps.has("a19")).toBe(true);
    expect(
        weeklyLearningSummary(result.activity, verses, "2026-10-05", "UTC"),
    ).toEqual({ learned: 2, reviewed: 2, difficult: 0, activityDays: 1 });
});

test("future events are ignored and dates follow the learner's time zone", () => {
    const result = activity(
        [
            assessment("learn", "2026-10-05T23:30:00Z"),
            assessment("future", "2026-10-07T00:00:00Z"),
        ],
        {
            timezone: "Africa/Casablanca",
            now: new Date("2026-10-06T01:00:00Z"),
        },
    );
    expect(result.followUps.get("a19")).toEqual({
        stage: 0,
        due: "2026-10-07",
    });
    expect(result.activity).toHaveLength(1);
});

test("focused practice counts as an active day without earning memorization credit", () => {
    expect(
        weeklyLearningSummary([], verses, "2026-10-05", "Africa/Casablanca", [
            new Date("2026-10-04T23:30:00Z"),
            new Date("2026-10-05T10:00:00Z"),
            new Date("2026-10-11T23:30:00Z"),
        ]),
    ).toEqual({ learned: 0, reviewed: 0, difficult: 0, activityDays: 1 });
});

test("follow-ups enter the next eligible day without exceeding any daily allowance", () => {
    const followUps = new Map([["a19", { stage: 0, due: "2026-10-06" }]]);
    const rows = schedule({ followUps });
    expect(rows.find((r) => r.quarters.includes(10))?.scheduledDate).toBe(
        "2026-10-06",
    );
    expect(rows.find((r) => r.quarters.includes(10))?.reviewAfter).toBe(
        "2026-10-06",
    );
    for (const day of new Set(rows.map((r) => r.scheduledDate)))
        expect(
            new Set(
                rows
                    .filter((r) => r.scheduledDate === day)
                    .flatMap((r) => r.quarters),
            ).size,
        ).toBeLessThanOrEqual(1);
    expect(rows.some((r) => !r.reviewAfter)).toBe(true);
});

test("peer credit from initial memorization cannot finish a later follow-up", () => {
    const events = [
        assessment("peer-learn", "2026-10-05T10:00:00Z", 19, 20, {
            method: "peer",
        }),
    ];
    const range = {
        ...schedule({
            followUps: new Map([["a19", { stage: 0, due: "2026-10-06" }]]),
        }).find((r) => r.reviewAfter),
        riwayah: "hafs",
        completedAt: null,
    };
    expect(
        revisionCoverage(
            catalogue,
            range,
            weekPeerAtoms(
                catalogue,
                events,
                "2026-10-05",
                "UTC",
                new Date("2026-10-07"),
                range.reviewAfter,
            ),
        ).done,
    ).toBe(false);
    events.push(
        assessment("peer-review", "2026-10-06T10:00:00Z", 19, 20, {
            method: "peer",
        }),
    );
    expect(
        revisionCoverage(
            catalogue,
            range,
            weekPeerAtoms(
                catalogue,
                events,
                "2026-10-05",
                "UTC",
                new Date("2026-10-07"),
                range.reviewAfter,
            ),
        ).done,
    ).toBe(true);
});

test("refresh preserves started portions, uses original capacity, and stabilizes IDs on repeat", () => {
    const rows = saved(schedule());
    rows[0].progressSurahNumber = 2;
    rows[0].progressAyahNumber = 1;
    const due = new Map([["a19", { stage: 0, due: "2026-10-05" }]]);
    const update = repair(rows, due);
    expect(update.removed).not.toContain(rows[0].id);
    expect(update.replacements.some((r) => r.reviewAfter)).toBe(true);
    const next = [
        ...rows.filter((r) => !update.removed.includes(r.id)),
        ...saved(update.replacements).map((r) => ({ ...r, id: `new-${r.id}` })),
    ];
    expect(repair(next, due).removed).toEqual([]);
    expect(
        new Set(
            next
                .filter((r) => r.scheduledDate === "2026-10-06")
                .flatMap((r) => r.quarters),
        ).size,
    ).toBe(1);
});

test("completed follow-up can be repeated later in the same batch, within its reserved budget", () => {
    const rows = saved(schedule());
    rows[0] = {
        ...rows[0],
        quarters: [10],
        startAyahNumber: 19,
        endAyahNumber: 20,
        reviewAfter: "2026-10-05",
        completedAt: new Date("2026-10-05T12:00:00Z"),
        done: true,
    };
    const update = repair(
        rows,
        new Map([["a19", { stage: 1, due: "2026-10-08" }]]),
    );
    expect(update.replacements.find((s) => s.reviewAfter)?.scheduledDate).toBe(
        "2026-10-08",
    );
    expect(update.removed).not.toContain(rows[0].id);
});

test("frozen paused-day projections cannot be rewritten", () => {
    const rows = saved(schedule()).map((s) => ({ ...s, projectedDate: null }));
    expect(
        repair(rows, new Map([["a19", { stage: 0, due: "2026-10-05" }]]))
            .removed,
    ).toEqual([]);
});
test("a small memorized passage can get its next follow-up on an unused study day", () => {
    const row = {
        ...saved(schedule())[0],
        quarters: [10],
        startAyahNumber: 19,
        endAyahNumber: 20,
        reviewAfter: "2026-10-05",
        done: true,
        completedAt: new Date("2026-10-05T12:00:00Z"),
    };
    const update = repair(
        [row],
        new Map([["a19", { stage: 1, due: "2026-10-08" }]]),
        {
            covered: new Set(["a19", "a20"]),
            additionalDays: ["2026-10-06", "2026-10-07", "2026-10-08"],
        },
    );
    expect(update.removed).toEqual([]);
    expect(update.replacements).toHaveLength(1);
    expect(update.replacements[0].scheduledDate).toBe("2026-10-08");
    expect(update.replacements[0].quarters).toEqual([10]);
    const next = [
        ...saved(update.replacements).map((s) => ({ ...s, id: "new" })),
        row,
    ];
    expect(
        repair(next, new Map([["a19", { stage: 1, due: "2026-10-08" }]]), {
            covered: new Set(["a19", "a20"]),
            additionalDays: ["2026-10-06", "2026-10-07"],
        }).replacements,
    ).toEqual([]);
});

test("corrections and gaps exclude unavailable ayahs from follow-up scheduling", () => {
    const covered = new Set(["a1", "a3", "a19"]);
    const rows = schedule({
        covered,
        followUps: new Map([
            ["a19", { stage: 0, due: "2026-10-05" }],
            ["a20", { stage: 0, due: "2026-10-05" }],
        ]),
    });
    expect(rows.find((r) => r.reviewAfter)?.endAyahNumber).toBe(19);
    expect(rows.every((r) => r.startAyahNumber === r.endAyahNumber)).toBe(true);
});

test("connecting practice stops at unknown ayahs and never crosses a surah boundary", () => {
    expect(
        connectingVerses(
            verses,
            { surahNumber: 2, ayahNumber: 6 },
            allKnown,
        ).map((v) => v.ayahNumber),
    ).toEqual([3, 4, 5]);
    expect(
        connectingVerses(
            verses,
            { surahNumber: 2, ayahNumber: 6 },
            new Set(["a3", "a5"]),
        ).map((v) => v.ayahNumber),
    ).toEqual([5]);
    expect(
        connectingVerses(verses, { surahNumber: 2, ayahNumber: 1 }, allKnown),
    ).toEqual([]);
});

test("similar exercise maps native reading but never includes a partially known native ayah", () => {
    const split = {
        hafs: [
            { ...verses[0], atoms: ["x", "y"] },
            { ...verses[1], atoms: ["z"] },
        ],
        warsh: [
            { ...verses[0], atoms: ["x"] },
            { ...verses[1], atoms: ["y"] },
            { ...verses[2], atoms: ["z"] },
        ],
    };
    expect(
        memorizedSimilarReferences(
            split,
            "hafs",
            new Set(["x", "z"]),
            [{ surah: 2, ayah: 1 }],
            { surahNumber: 2, ayahNumber: 2 },
        ),
    ).toEqual([]);
    expect(
        memorizedSimilarReferences(
            split,
            "warsh",
            new Set(["x", "z"]),
            [{ surah: 2, ayah: 1 }],
            { surahNumber: 2, ayahNumber: 3 },
        ).map((v) => v.ayahNumber),
    ).toEqual([1]);
});

test("word comparison preserves spelling and detects missing/changed continuation", () => {
    expect(differingWords("قَالَ رَبِّ", "قَالَ رَبِّي").map((w) => w.different)).toEqual(
        [false, true],
    );
    expect(differingWords("قال رب", "قَالَ رَبِّ").every((w) => !w.different)).toBe(
        true,
    );
    expect(opening("قُلْ هُوَ اللَّهُ أَحَدٌ")).toBe("قُلْ هُوَ اللَّهُ");
    expect(opening("طسم")).toBe("طسم");
});
