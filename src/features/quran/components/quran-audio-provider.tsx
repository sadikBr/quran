"use client";

import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
    createContext,
    type ReactNode,
    use,
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";
import {
    AudioPlayer,
    type PlayerState,
    type PlayerStatus,
} from "../helpers/audio-player";
import { type AudioTrack, queuesMatch } from "../helpers/audio-track";
import NowPlaying from "./quran-now-playing";

export type QuranAudioQueueItem = AudioTrack;
export type QuranAudioStatus = PlayerStatus;
type ContextValue = {
    activeAyahNumber: number | null;
    playbackStatus: PlayerStatus;
    progress: number;
    isPlaying: boolean;
    toggleAudio: (number: number, streams: string[]) => Promise<void>;
    retryAudio: () => Promise<void>;
    setReaderQueue: (queue: AudioTrack[], continuous: boolean) => void;
    isQueuePlaying: (queue: AudioTrack[]) => boolean;
    getQueueStatus: (queue: AudioTrack[]) => PlayerStatus;
    restartQueue: (queue: AudioTrack[]) => void;
    toggleQueue: (queue: AudioTrack[]) => Promise<void>;
};
const Context = createContext<ContextValue | undefined>(undefined);
const initial: PlayerState = {
    track: null,
    status: "idle",
    progress: 0,
    queue: [],
    index: 0,
    repetition: 1,
};
export type AudioCatalog = {
    reciters: { prefix: string; name: string; arabicName: string }[];
    surahs: { number: number; name: string; englishName: string }[];
};

export default function QuranAudioProvider({
    children,
    catalog,
}: {
    children: ReactNode;
    catalog?: AudioCatalog;
}) {
    const [state, setState] = useState(initial);
    const [player] = useState(
        () =>
            new AudioPlayer(
                () => {
                    const audio = new Audio();
                    audio.hidden = true;
                    document.body.append(audio);
                    return audio;
                },
                setState,
                () => {
                    const connection = (
                        navigator as Navigator & {
                            connection?: {
                                saveData?: boolean;
                                effectiveType?: string;
                            };
                        }
                    ).connection;
                    return (
                        navigator.onLine &&
                        !connection?.saveData &&
                        !["slow-2g", "2g"].includes(
                            connection?.effectiveType ?? "",
                        )
                    );
                },
            ),
    );
    const t = useTranslations("Reader.audio");
    const locale = useLocale();
    const pathname = usePathname();
    const readerPath = pathname.includes("/ayah/") ? null : pathname;
    const previousPath = useRef(readerPath);
    useEffect(() => {
        if (readerPath === null) return;
        if (previousPath.current !== readerPath) player.stop();
        previousPath.current = readerPath;
    }, [readerPath, player]);
    useEffect(() => () => player.stop(), [player]);
    const hasTrack = Boolean(state.track);
    useEffect(() => {
        if (hasTrack) document.body.dataset.audioPlayer = "visible";
        else delete document.body.dataset.audioPlayer;
        return () => {
            delete document.body.dataset.audioPlayer;
        };
    }, [hasTrack]);
    const retryAudio = useCallback(async () => player.retry(), [player]);

    const labelTrack = useCallback(
        (track: AudioTrack) => {
            const url = track.streams[0] ?? "";
            const reciter = catalog?.reciters.find((item) =>
                url.startsWith(item.prefix),
            );
            // Quranpedia's catalog specifies padded chapter/verse filenames.
            const numbers = /\/(\d{3})(\d{3})?\.mp3(?:\?.*)?$/.exec(url);
            const surah = catalog?.surahs.find(
                (item) => item.number === Number(numbers?.[1]),
            );
            const name = surah
                ? locale === "ar"
                    ? surah.name
                    : surah.englishName
                : t("nowPlaying");
            const title = numbers?.[2]
                ? `${name} · ${t("verseNumber", { number: String(Number(numbers[2])) })}`
                : name;
            return {
                title,
                artist: reciter
                    ? locale === "ar"
                        ? reciter.arabicName
                        : reciter.name
                    : "",
            };
        },
        [catalog, locale, t],
    );
    const title = state.track ? labelTrack(state.track) : null;

    useEffect(() => {
        if (!("mediaSession" in navigator)) return;
        const actions: [
            MediaSessionAction,
            MediaSessionActionHandler | null,
        ][] = [
            [
                "play",
                () => {
                    void player.resume();
                },
            ],
            ["pause", player.pause],
            ["stop", player.stop],
            [
                "nexttrack",
                state.index + 1 < state.queue.length ? player.skip : null,
            ],
        ];
        for (const [action, handler] of actions) {
            try {
                navigator.mediaSession.setActionHandler(
                    action,
                    state.track ? handler : null,
                );
            } catch {
                /* Optional browser capability. */
            }
        }
        return () => {
            for (const [action] of actions) {
                try {
                    navigator.mediaSession.setActionHandler(action, null);
                } catch {
                    /* Unsupported action. */
                }
            }
        };
    }, [player, state.track, state.index, state.queue.length]);
    const mediaTitle = title?.title;
    const mediaArtist = title?.artist;
    useEffect(() => {
        if (!("mediaSession" in navigator)) return;
        if (typeof MediaMetadata !== "undefined")
            navigator.mediaSession.metadata = mediaTitle
                ? new MediaMetadata({ title: mediaTitle, artist: mediaArtist })
                : null;
        navigator.mediaSession.playbackState =
            !state.track || state.status === "idle"
                ? "none"
                : state.status === "playing"
                  ? "playing"
                  : "paused";
        return () => {
            navigator.mediaSession.metadata = null;
            navigator.mediaSession.playbackState = "none";
        };
    }, [mediaTitle, mediaArtist, state.status, state.track]);

    return (
        <Context.Provider
            value={{
                activeAyahNumber: state.track?.ayahNumber ?? null,
                playbackStatus: state.status,
                progress: state.progress,
                isPlaying:
                    state.status === "playing" || state.status === "waiting",
                toggleAudio: player.toggleTrack,
                retryAudio,
                setReaderQueue: player.register,
                isQueuePlaying: (queue) =>
                    (state.status === "playing" ||
                        state.status === "waiting") &&
                    queuesMatch(queue, state.queue),
                getQueueStatus: (queue) =>
                    queuesMatch(queue, state.queue) ? state.status : "idle",
                restartQueue: player.start,
                toggleQueue: player.toggleQueue,
            }}
        >
            {children}
            {state.track && (
                <NowPlaying
                    player={player}
                    state={state}
                    title={title?.title ?? ""}
                    artist={title?.artist ?? ""}
                    labelTrack={labelTrack}
                />
            )}
        </Context.Provider>
    );
}

export function useQuranAudio() {
    const context = use(Context);
    if (!context)
        throw new Error(
            "useQuranAudio must be used within QuranAudioProvider.",
        );
    return context;
}
