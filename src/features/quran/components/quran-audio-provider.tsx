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
    isPlaying: boolean;
    toggleAudio: (ayahNumber: number, streams: string[]) => Promise<void>;
    setReaderQueue: (
        queue: QuranAudioQueueItem[],
        continuousRecitation: boolean,
    ) => void;
    isQueuePlaying: (queue: QuranAudioQueueItem[]) => boolean;
    restartQueue: (queue: QuranAudioQueueItem[]) => void;
    toggleQueue: (queue: QuranAudioQueueItem[]) => Promise<void>;
};

export type QuranAudioQueueItem = {
    ayahNumber: number;
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
    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {
        const audio = audioRef.current;

        if (!audio || activeStreams.length === 0) return;

        audio.load();

        if (!shouldPlayRef.current) return;

        shouldPlayRef.current = false;
        void audio.play().catch(() => {
            setIsPlaying(false);
            toast.error("Unable to play this recitation");
        });
    }, [activeStreams]);

    const playAyah = useCallback((item: QuranAudioQueueItem) => {
        shouldPlayRef.current = true;
        setActiveAyahNumber(item.ayahNumber);
        setActiveStreams(item.streams);
    }, []);

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
                        await audio.play();
                    } catch {
                        setIsPlaying(false);
                        toast.error("Unable to play this recitation");
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

    const toggleQueue = useCallback(
        async (queue: QuranAudioQueueItem[]) => {
            const audio = audioRef.current;

            if (!audio || queue.length === 0) return;

            if (playbackQueueRef.current?.queue === queue) {
                if (audio.paused) {
                    try {
                        await audio.play();
                    } catch {
                        setIsPlaying(false);
                        toast.error("Unable to play this recitation");
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
                isPlaying,
                toggleAudio,
                setReaderQueue,
                isQueuePlaying,
                restartQueue,
                toggleQueue,
            }}
        >
            {children}
            {/* biome-ignore lint/a11y/useMediaCaption: The recitation is operated through labelled play buttons. */}
            <audio
                ref={audioRef}
                className="hidden"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
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
                    setIsPlaying(false);
                }}
                onError={() => {
                    setIsPlaying(false);
                    toast.error("Unable to play this recitation");
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
