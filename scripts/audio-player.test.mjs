import { expect, test } from "bun:test";
import { AudioPlayer } from "../src/features/quran/helpers/audio-player";

class FakeAudio {
    ended = false;
    src = "";
    paused = true;
    currentTime = 0;
    duration = 10;
    play = () => {
        this.paused = false;
        return Promise.resolve();
    };
    pause() {
        this.paused = true;
        this.onpause?.();
    }
    load() {}
    remove() {}
    removeAttribute() {
        this.src = "";
    }
}

test("play all advances when natural completion emits pause before ended", () => {
    for (const preload of [false, true]) {
        const { player, media } = setup(preload);
        player.start([track(1), track(2), track(3)]);
        for (let index = 0; index < 3; index++) {
            const audio = media[index];
            audio.onplaying();
            expect(player.state.track.ayahNumber).toBe(index + 1);
            audio.ended = true;
            audio.pause();
            expect(player.state.status).toBe("playing");
            audio.onended();
        }
        expect(player.state.status).toBe("idle");
        expect(player.state.index).toBe(2);
        player.stop();
    }
});
const track = (n, reciter = "a") => ({
    ayahNumber: n,
    streams: [`${reciter}/${n}.mp3`],
});
function setup(preload = false) {
    const media = [];
    const player = new AudioPlayer(
        () => {
            const audio = new FakeAudio();
            media.push(audio);
            return audio;
        },
        () => {},
        () => preload,
    );
    return { player, media };
}

test("repeat off finishes the current range without looping again", () => {
    const { player, media } = setup();
    player.configure({ count: 3, gap: 0 });
    player.start([track(1), track(2)]);
    media[0].onplaying();
    player.disableRepeat();
    media[0].onended();
    expect(player.state.track.ayahNumber).toBe(2);
    media[1].onplaying();
    media[1].onended();
    expect(player.state.status).toBe("idle");
    expect(player.state.progress).toBe(1);
    expect(media).toHaveLength(2);
    player.stop();
});

test("repeat off cancels a pending repeated pass", async () => {
    const { player, media } = setup();
    player.configure({ count: 3, gap: 1 });
    player.start([track(1)]);
    media[0].onplaying();
    media[0].onended();
    expect(player.state.status).toBe("waiting");
    player.disableRepeat();
    await new Promise((resolve) => setTimeout(resolve, 1100));
    expect(player.state.status).toBe("idle");
    expect(media).toHaveLength(1);
    await player.resume();
    expect(player.state.status).toBe("loading");
    expect(player.state.index).toBe(0);
    player.stop();
});

test("rapid changes ignore old media events", async () => {
    const { player, media } = setup();
    player.start([track(1), track(2)]);
    const staleEnded = media[0].onended;
    const staleError = media[0].onerror;
    const stalePlaying = media[0].onplaying;
    await player.toggleTrack(3, ["a/3.mp3"]);
    staleEnded();
    staleError();
    stalePlaying();
    expect(player.state.track.ayahNumber).toBe(3);
    expect(player.state.status).toBe("loading");
    media.at(-1).onplaying();
    expect(player.state.status).toBe("playing");
    player.stop();
});

test("late rejected play promise cannot fail the next recording", async () => {
    let rejectPlay;
    let first = true;
    const player = new AudioPlayer(
        () => {
            const audio = new FakeAudio();
            if (first) {
                first = false;
                audio.play = () =>
                    new Promise((_, reject) => {
                        rejectPlay = reject;
                    });
            }
            return audio;
        },
        () => {},
        () => false,
    );
    player.start([track(1)]);
    player.start([track(2)]);
    rejectPlay(new Error("interrupted"));
    await Promise.resolve();
    expect(player.state.status).toBe("loading");
    expect(player.state.track.ayahNumber).toBe(2);
    player.stop();
});

test("pause during loading prevents late playing events from reviving playback", () => {
    const { player, media } = setup();
    player.start([track(1)]);
    player.pause();
    media[0].onplaying();
    expect(player.state.status).toBe("paused");
    player.stop();
});

test("pause during a gap waits for an explicit resume", async () => {
    const { player, media } = setup();
    player.configure({ count: 1, gap: 1 });
    player.start([track(1), track(2)]);
    media[0].onplaying();
    media[0].onended();
    player.pause();
    await new Promise((resolve) => setTimeout(resolve, 1100));
    expect(player.state.track.ayahNumber).toBe(1);
    await player.resume();
    expect(player.state.track.ayahNumber).toBe(2);
    player.stop();
});

test("same ayah with a new reciter loads a new recording", async () => {
    const { player, media } = setup();
    await player.toggleTrack(1, ["a/1.mp3"]);
    media[0].onplaying();
    await player.toggleTrack(1, ["b/1.mp3"]);
    expect(media).toHaveLength(2);
    expect(media[0].paused).toBe(true);
    expect(media[1].src).toBe("b/1.mp3");
    player.stop();
});

test("reader changes stop playback and prevent the previous queue advancing", () => {
    const { player, media } = setup();
    player.register([track(1), track(2)], true);
    player.start(player.readerQueue);
    const ended = media[0].onended;
    player.register([track(3)], true);
    ended();
    expect(player.state.track).toBeNull();
    expect(player.state.status).toBe("idle");
    expect(media[0].paused).toBe(true);
});

test("reader and popup toggle the same recording and continue from that verse", async () => {
    const { player, media } = setup();
    player.register([track(1001), track(1002)], true);
    await player.toggleTrack(1001, ["a/1001.mp3"]);
    media[0].onplaying();
    await player.toggleTrack(1001, ["a/1001.mp3"]);
    expect(player.state.status).toBe("paused");
    await player.toggleTrack(1001, ["a/1001.mp3"]);
    media[0].onplaying();
    media[0].onended();
    expect(player.state.track.ayahNumber).toBe(1002);
    player.stop();
});

test("failed audio stays on the verse until explicit retry or skip", () => {
    const { player, media } = setup();
    player.start([track(1), track(2)]);
    media[0].onerror();
    expect(player.state.status).toBe("error");
    expect(player.state.index).toBe(0);
    player.retry();
    expect(media[1].src).toBe("a/1.mp3");
    media[1].onerror();
    player.skip();
    expect(player.state.track.ayahNumber).toBe(2);
    player.stop();
});

test("selected range repeats exactly the requested number of times", () => {
    const { player, media } = setup();
    player.configure({ count: 3, gap: 0 });
    player.start([track(2), track(3)]);
    const order = [];
    for (let i = 0; i < 6; i++) {
        order.push(player.state.track.ayahNumber);
        media.at(-1).onplaying();
        media.at(-1).onended();
    }
    expect(order).toEqual([2, 3, 2, 3, 2, 3]);
    expect(player.state.status).toBe("idle");
    expect(player.state.repetition).toBe(3);
    player.stop();
});

test("stopping during a recitation gap cancels the scheduled next verse", async () => {
    const { player, media } = setup();
    player.configure({ count: 2, gap: 1 });
    player.start([track(1)]);
    media[0].onplaying();
    media[0].onended();
    expect(player.state.status).toBe("waiting");
    player.stop();
    await new Promise((resolve) => setTimeout(resolve, 1100));
    expect(media).toHaveLength(1);
    expect(player.state.track).toBeNull();
});

test("preloads only the next ayah and reuses the warmed audio element", () => {
    const { player, media } = setup(true);
    player.start([track(1), track(2), track(3)]);
    media[0].onplaying();
    expect(media).toHaveLength(2);
    expect(media[1].src).toBe("a/2.mp3");
    expect(media[1].paused).toBe(true);
    media[0].onended();
    expect(media).toHaveLength(2);
    expect(media[1].paused).toBe(false);
    player.stop();
    expect(media[1].src).toBe("");
});

test("does not preload whole surahs or on data-saving connections", () => {
    for (const allowed of [true, false]) {
        const { player, media } = setup(allowed);
        player.start([
            track(1),
            allowed ? { ayahNumber: null, streams: ["whole.mp3"] } : track(2),
        ]);
        media[0].onplaying();
        expect(media).toHaveLength(1);
        player.stop();
    }
});
