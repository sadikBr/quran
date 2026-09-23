import type { AyahType } from "../types";

export default function getAyahAudioStreams(
    ayah: Pick<AyahType, "audio" | "audioSecondary">,
) {
    const streams: string[] = [];

    if (ayah.audio) {
        streams.push(ayah.audio);
    }

    if (ayah.audioSecondary) {
        streams.push(...ayah.audioSecondary);
    }

    return streams;
}
