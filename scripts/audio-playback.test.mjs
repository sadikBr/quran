import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
    queuesMatch,
    tracksMatch,
} from "../src/features/quran/helpers/audio-track";
import { getNativeWarshPlaybackNumber } from "../src/features/quran/helpers/map-warsh-ayahs";

const source = (path) =>
    readFileSync(
        new URL(`../src/features/quran/${path}`, import.meta.url),
        "utf8",
    );
const track = (ayahNumber, url) => ({ ayahNumber, streams: [url] });

test("recording identity includes the source, not just its verse number", () => {
    const original = track(1001, "reciter-a/001001.mp3");
    expect(
        tracksMatch(original, { ...original, streams: [...original.streams] }),
    ).toBe(true);
    expect(tracksMatch(original, track(1001, "reciter-b/001001.mp3"))).toBe(
        false,
    );
    expect(tracksMatch(original, track(1002, original.streams[0]))).toBe(false);
    expect(tracksMatch(null, original)).toBe(false);
});

test("queue identity changes for navigation, reciter changes and clearing", () => {
    const queue = [track(1001, "a"), track(1002, "b")];
    expect(
        queuesMatch(
            queue,
            queue.map((item) => ({ ...item })),
        ),
    ).toBe(true);
    expect(queuesMatch(queue, [])).toBe(false);
    expect(queuesMatch(queue, [...queue].reverse())).toBe(false);
    expect(queuesMatch(queue, [track(1001, "new-reciter"), queue[1]])).toBe(
        false,
    );
});

test("Warsh popup uses the reader playback ID without replacing saved verse identity", () => {
    expect(getNativeWarshPlaybackNumber({ number: 1 }, 1)).toBe(1001);
    const server = source("server/get-ayah-actions-data.ts");
    expect(server).toContain(
        "getNativeWarshPlaybackNumber(warshVerse, surahNumber)",
    );
    expect(server).toContain("globalAyahNumber: ayah.number");
    expect(source("components/ayah-actions.tsx")).toContain(
        "toggleAudio(playbackAyahNumber, audioStreams)",
    );
});

test("page readers reject full-surah recordings when constructing ayah queues", () => {
    for (const file of ["quran-page", "warsh-quran-page"]) {
        expect(source(`components/${file}.tsx`)).toMatch(
            /streams:\s*reciter\?\.scope === "ayah"/,
        );
    }
});

// Playback lifecycle is exercised with controllable media elements in audio-player.test.mjs.
