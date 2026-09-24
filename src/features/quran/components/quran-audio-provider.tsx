"use client";

import {
    createContext,
    type ReactNode,
    use,
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";
import { toast } from "sonner";

type QuranAudioContextValue = {
    activeAyahNumber: number | null;
    playbackStatus: QuranAudioStatus;
    progress: number;
    isPlaying: boolean;
    toggleAudio: (ayahNumber: number, streams: string[]) => Promise<void>;
    retryAudio: () => Promise<void>;
    setReaderQueue: (
        queue: QuranAudioQueueItem[],
        continuousRecitation: boolean,
    ) => void;
    isQueuePlaying: (queue: QuranAudioQueueItem[]) => boolean;
    getQueueStatus: (queue: QuranAudioQueueItem[]) => QuranAudioStatus;
    restartQueue: (queue: QuranAudioQueueItem[]) => void;
    toggleQueue: (queue: QuranAudioQueueItem[]) => Promise<void>;
};

export type QuranAudioStatus =
    | "idle"
    | "loading"
    | "playing"
    | "paused"
    | "error";

export type QuranAudioQueueItem = {
    ayahNumber: number | null;
    streams: string[];
};

const QuranAudioContext = createContext<QuranAudioContextValue | undefined>(
    undefined,
);

export default function QuranAudioProvider({
    children,
}: {
    children: ReactNode;
}) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const shouldPlayRef = useRef(false);
    const readerQueueRef = useRef<QuranAudioQueueItem[]>([]);
    const continuousRecitationRef = useRef(false);
    const playbackQueueRef = useRef<{
        queue: QuranAudioQueueItem[];
        index: number;
    } | null>(null);
    const [activeAyahNumber, setActiveAyahNumber] = useState<number | null>(
        null,
    );
    const [activeStreams, setActiveStreams] = useState<string[]>([]);
    const [playbackStatus, setPlaybackStatus] =
        useState<QuranAudioStatus>("idle");
    const [progress, setProgress] = useState(0);
    const isPlaying = playbackStatus === "playing";

    useEffect(() => {
        const audio = audioRef.current;

        if (!audio || activeStreams.length === 0) return;

        audio.load();
        setPlaybackStatus("loading");
        setProgress(0);

        if (!shouldPlayRef.current) return;

        shouldPlayRef.current = false;
        void audio.play().catch(() => {
            setPlaybackStatus("error");
            toast.error("Unable to play this recitation", {
                id: "quran-audio-error",
            });
        });
    }, [activeStreams]);

    const playAyah = useCallback((item: QuranAudioQueueItem) => {
        shouldPlayRef.current = true;
        setPlaybackStatus("loading");
        setProgress(0);
        setActiveAyahNumber(item.ayahNumber);
        setActiveStreams(item.streams);
    }, []);

    const retryAudio = useCallback(async () => {
        const audio = audioRef.current;

        if (!audio || activeStreams.length === 0) return;

        setPlaybackStatus("loading");
        setProgress(0);
        audio.load();

        try {
            await audio.play();
        } catch {
            setPlaybackStatus("error");
            toast.error("Unable to play this recitation", {
                id: "quran-audio-error",
            });
        }
    }, [activeStreams]);

    const playQueue = useCallback(
        (queue: QuranAudioQueueItem[], index = 0) => {
            const item = queue[index];

            if (!item) return;

            playbackQueueRef.current = { queue, index };
            playAyah(item);
        },
        [playAyah],
    );

    const toggleAudio = useCallback(
        async (ayahNumber: number, streams: string[]) => {
            const audio = audioRef.current;

            if (!audio || streams.length === 0) return;

            if (activeAyahNumber === ayahNumber) {
                if (audio.paused) {
                    try {
                        setPlaybackStatus("loading");
                        await audio.play();
                    } catch {
                        setPlaybackStatus("error");
                        toast.error("Unable to play this recitation", {
                            id: "quran-audio-error",
                        });
                    }
                    return;
                }

                audio.pause();
                return;
            }

            const queueIndex = readerQueueRef.current.findIndex(
                (item) => item.ayahNumber === ayahNumber,
            );

            if (continuousRecitationRef.current && queueIndex !== -1) {
                playQueue(readerQueueRef.current, queueIndex);
                return;
            }

            playbackQueueRef.current = null;
            playAyah({ ayahNumber, streams });
        },
        [activeAyahNumber, playAyah, playQueue],
    );

    const setReaderQueue = useCallback(
        (queue: QuranAudioQueueItem[], continuousRecitation: boolean) => {
            readerQueueRef.current = queue;
            continuousRecitationRef.current = continuousRecitation;

            if (queue.length === 0) {
                playbackQueueRef.current = null;
            }
        },
        [],
    );

    const isQueuePlaying = useCallback(
        (queue: QuranAudioQueueItem[]) =>
            isPlaying && playbackQueueRef.current?.queue === queue,
        [isPlaying],
    );

    const getQueueStatus = useCallback(
        (queue: QuranAudioQueueItem[]) =>
            playbackQueueRef.current?.queue === queue ? playbackStatus : "idle",
        [playbackStatus],
    );

    const toggleQueue = useCallback(
        async (queue: QuranAudioQueueItem[]) => {
            const audio = audioRef.current;

            if (!audio || queue.length === 0) return;

            if (playbackQueueRef.current?.queue === queue) {
                if (audio.paused) {
                    try {
                        setPlaybackStatus("loading");
                        await audio.play();
                    } catch {
                        setPlaybackStatus("error");
                        toast.error("Unable to play this recitation", {
                            id: "quran-audio-error",
                        });
                    }
                    return;
                }

                audio.pause();
                return;
            }

            playQueue(queue);
        },
        [playQueue],
    );

    const restartQueue = useCallback(
        (queue: QuranAudioQueueItem[]) => {
            playQueue(queue);
        },
        [playQueue],
    );

    return (
        <QuranAudioContext.Provider
            value={{
                activeAyahNumber,
                playbackStatus,
                progress,
                isPlaying,
                toggleAudio,
                retryAudio,
                setReaderQueue,
                isQueuePlaying,
                getQueueStatus,
                restartQueue,
                toggleQueue,
            }}
        >
            {children}
            {/* biome-ignore lint/a11y/useMediaCaption: The recitation is operated through labelled play buttons. */}
            <audio
                ref={audioRef}
                className="hidden"
                onLoadStart={() => setPlaybackStatus("loading")}
                onWaiting={() => setPlaybackStatus("loading")}
                onPlaying={() => setPlaybackStatus("playing")}
                onPause={() =>
                    setPlaybackStatus((status) =>
                        status === "error" ||
                        status === "idle" ||
                        status === "loading"
                            ? status
                            : "paused",
                    )
                }
                onTimeUpdate={(event) => {
                    const audio = event.currentTarget;
                    setProgress(
                        Number.isFinite(audio.duration) && audio.duration > 0
                            ? audio.currentTime / audio.duration
                            : 0,
                    );
                }}
                onEnded={() => {
                    const playbackQueue = playbackQueueRef.current;

                    if (
                        playbackQueue &&
                        playbackQueue.index + 1 < playbackQueue.queue.length
                    ) {
                        playQueue(playbackQueue.queue, playbackQueue.index + 1);
                        return;
                    }

                    playbackQueueRef.current = null;
                    setPlaybackStatus("idle");
                    setProgress(1);
                }}
                onError={() => {
                    setPlaybackStatus("error");
                    toast.error("Unable to play this recitation", {
                        id: "quran-audio-error",
                    });
                }}
            >
                {activeStreams.map((stream) => (
                    <source key={stream} src={stream} type="audio/mpeg" />
                ))}
            </audio>
        </QuranAudioContext.Provider>
    );
}

export function useQuranAudio() {
    const context = use(QuranAudioContext);

    if (!context) {
        throw new Error(
            "useQuranAudio must be used within QuranAudioProvider.",
        );
    }

    return context;
}
