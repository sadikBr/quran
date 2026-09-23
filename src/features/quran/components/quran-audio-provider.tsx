"use client";

import {
    createContext,
    type ReactNode,
    use,
    useEffect,
    useRef,
    useState,
} from "react";
import { toast } from "sonner";

type QuranAudioContextValue = {
    activeAyahNumber: number | null;
    isPlaying: boolean;
    toggleAudio: (ayahNumber: number, streams: string[]) => Promise<void>;
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

    async function toggleAudio(ayahNumber: number, streams: string[]) {
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

        shouldPlayRef.current = true;
        setActiveAyahNumber(ayahNumber);
        setActiveStreams(streams);
    }

    return (
        <QuranAudioContext.Provider
            value={{ activeAyahNumber, isPlaying, toggleAudio }}
        >
            {children}
            {/* biome-ignore lint/a11y/useMediaCaption: The recitation is operated through labelled play buttons. */}
            <audio
                ref={audioRef}
                className="hidden"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
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
