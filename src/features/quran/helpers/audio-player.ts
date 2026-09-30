import { type AudioTrack, queuesMatch, tracksMatch } from "./audio-track";

export type PlayerStatus =
    | "idle"
    | "loading"
    | "playing"
    | "paused"
    | "error"
    | "waiting";
export type PlayerState = {
    track: AudioTrack | null;
    status: PlayerStatus;
    progress: number;
    queue: AudioTrack[];
    index: number;
    repetition: number;
};
export type RepeatOptions = { count: number; gap: number };

// Owns playback independently of React. Every recording gets an event generation;
// old play promises, media events and delayed repetitions cannot affect a new one.
export class AudioPlayer {
    state: PlayerState = {
        track: null,
        status: "idle",
        progress: 0,
        queue: [],
        index: 0,
        repetition: 1,
    };
    readerQueue: AudioTrack[] = [];
    continuous = false;
    repeat: RepeatOptions = { count: 1, gap: 0 };
    private audio: HTMLAudioElement | null = null;
    private generation = 0;
    private timer: ReturnType<typeof setTimeout> | undefined;
    private waitingIndex: number | null = null;
    private preload: HTMLAudioElement | null = null;
    private preloadUrl: string | null = null;

    constructor(
        private createAudio: () => HTMLAudioElement,
        private notify: (state: PlayerState) => void,
        private allowPreload = () => true,
    ) {}

    private emit(update: Partial<PlayerState>) {
        this.state = { ...this.state, ...update };
        this.notify(this.state);
    }
    private clearTimer() {
        clearTimeout(this.timer);
        this.timer = undefined;
    }
    private release(audio: HTMLAudioElement | null) {
        if (!audio) return;
        audio.onplaying =
            audio.onwaiting =
            audio.onended =
            audio.onerror =
            audio.onpause =
            audio.ontimeupdate =
                null;
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
        audio.remove();
    }
    private clearPreload() {
        this.release(this.preload);
        this.preload = null;
        this.preloadUrl = null;
    }
    private timeout(generation: number) {
        this.clearTimer();
        this.timer = setTimeout(() => {
            if (generation === this.generation) this.fail();
        }, 15000);
    }
    private fail() {
        this.clearTimer();
        this.audio?.pause();
        this.emit({ status: "error" });
    }
    stop = () => {
        this.generation++;
        this.clearTimer();
        this.waitingIndex = null;
        this.release(this.audio);
        this.audio = null;
        this.clearPreload();
        this.emit({
            track: null,
            status: "idle",
            progress: 0,
            queue: [],
            index: 0,
            repetition: 1,
        });
    };
    register = (queue: AudioTrack[], continuous: boolean) => {
        if (!queuesMatch(this.readerQueue, queue)) this.stop();
        this.readerQueue = queue;
        this.continuous = continuous;
    };
    start = (queue: AudioTrack[], index = 0) => {
        if (!queue[index]?.streams.length) return;
        this.emit({ queue, index, repetition: 1 });
        this.load(index);
    };
    private load(index: number) {
        const track = this.state.queue[index];
        if (!track) {
            this.stop();
            return;
        }
        const generation = ++this.generation;
        this.clearTimer();
        this.waitingIndex = null;
        this.release(this.audio);
        const audio =
            this.preloadUrl === track.streams[0] && this.preload
                ? this.preload
                : this.createAudio();
        if (audio === this.preload) {
            this.preload = null;
            this.preloadUrl = null;
        } else {
            this.clearPreload();
            audio.src = track.streams[0];
        }
        this.audio = audio;
        this.emit({ track, index, status: "loading", progress: 0 });
        const current = () => generation === this.generation;
        audio.onplaying = () => {
            if (
                current() &&
                this.state.status !== "paused" &&
                this.state.status !== "error"
            ) {
                this.clearTimer();
                this.emit({ status: "playing" });
                this.preloadNext();
            }
        };
        audio.onwaiting = () => {
            if (
                current() &&
                this.state.status !== "paused" &&
                this.state.status !== "error"
            ) {
                this.emit({ status: "loading" });
                this.timeout(generation);
            }
        };
        audio.onpause = () => {
            // Browsers also emit pause at natural completion, before ended.
            // That is not a user pause: leave the queue eligible to advance.
            if (current() && !audio.ended && this.state.status === "playing")
                this.emit({ status: "paused" });
        };
        audio.ontimeupdate = () => {
            if (current())
                this.emit({
                    progress:
                        Number.isFinite(audio.duration) && audio.duration > 0
                            ? audio.currentTime / audio.duration
                            : 0,
                });
        };
        audio.onerror = () => {
            if (current()) this.fail();
        };
        audio.onended = () => {
            if (current() && ["playing", "loading"].includes(this.state.status))
                this.ended();
        };
        this.timeout(generation);
        void audio.play().catch(() => {
            if (current() && this.state.status !== "paused") this.fail();
        });
    }
    private preloadNext() {
        const next = this.state.queue[this.state.index + 1];
        // Never preload a whole-surah file, nor use extra data on constrained connections.
        if (!next || next.ayahNumber === null || !this.allowPreload()) {
            this.clearPreload();
            return;
        }
        if (this.preloadUrl === next.streams[0]) return;
        this.clearPreload();
        this.preload = this.createAudio();
        this.preloadUrl = next.streams[0];
        this.preload.preload = "auto";
        this.preload.src = this.preloadUrl;
        this.preload.load();
    }
    private ended() {
        let next = this.state.index + 1;
        if (next === this.state.queue.length) {
            if (this.state.repetition >= this.repeat.count) {
                this.emit({ status: "idle", progress: 1 });
                this.clearPreload();
                return;
            }
            next = 0;
            this.emit({ repetition: this.state.repetition + 1 });
        }
        if (this.repeat.gap > 0) {
            this.waitingIndex = next;
            this.emit({ status: "waiting", progress: 1 });
            this.timer = setTimeout(
                () => this.load(next),
                this.repeat.gap * 1000,
            );
        } else this.load(next);
    }
    pause = () => {
        this.clearTimer();
        this.audio?.pause();
        this.emit({ status: "paused" });
    };
    resume = async () => {
        if (!this.state.track) return;
        if (this.waitingIndex !== null) {
            this.load(this.waitingIndex);
            return;
        }
        if (this.state.status === "error") {
            this.retry();
            return;
        }
        if (this.state.status === "idle") {
            this.start(this.state.queue);
            return;
        }
        const generation = this.generation;
        this.emit({ status: "loading" });
        this.timeout(generation);
        try {
            await this.audio?.play();
        } catch {
            if (
                generation === this.generation &&
                this.state.status !== "paused"
            )
                this.fail();
        }
    };
    toggle = async () => {
        if (["playing", "loading", "waiting"].includes(this.state.status))
            this.pause();
        else await this.resume();
    };
    retry = () => {
        if (this.state.track) this.load(this.state.index);
    };
    skip = () => {
        if (this.state.index + 1 < this.state.queue.length)
            this.load(this.state.index + 1);
    };
    toggleTrack = async (ayahNumber: number, streams: string[]) => {
        if (!streams.length) return;
        const track = { ayahNumber, streams };
        if (tracksMatch(this.state.track, track)) {
            await this.toggle();
            return;
        }
        const index = this.readerQueue.findIndex((item) =>
            tracksMatch(item, track),
        );
        if (this.continuous && index !== -1)
            this.start(this.readerQueue, index);
        else this.start([track]);
    };
    toggleQueue = async (queue: AudioTrack[]) => {
        if (queuesMatch(queue, this.state.queue) && this.state.track)
            await this.toggle();
        else this.start(queue);
    };
    disableRepeat = () => {
        this.repeat = { count: 1, gap: 0 };
        // Cancel a scheduled return to the start, but finish the current pass.
        if (this.waitingIndex === 0) {
            this.clearTimer();
            this.waitingIndex = null;
            this.emit({ status: "idle", progress: 1, repetition: 1 });
        } else {
            this.emit({ repetition: 1 });
        }
    };
    configure = (options: RepeatOptions) => {
        this.repeat = {
            count: Math.max(1, Math.min(20, Math.trunc(options.count) || 1)),
            gap: Math.max(0, Math.min(30, Math.trunc(options.gap) || 0)),
        };
    };
}
