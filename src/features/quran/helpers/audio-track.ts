export type AudioTrack = {
    ayahNumber: number | null;
    streams: string[];
};

// A verse identifier alone cannot distinguish reciters or recording sources.
export function tracksMatch(first: AudioTrack | null, second: AudioTrack) {
    return Boolean(
        first &&
            first.ayahNumber === second.ayahNumber &&
            first.streams.length === second.streams.length &&
            first.streams.every(
                (stream, index) => stream === second.streams[index],
            ),
    );
}

export function queuesMatch(first: AudioTrack[], second: AudioTrack[]) {
    return (
        first.length === second.length &&
        first.every((item, index) => tracksMatch(item, second[index]))
    );
}
