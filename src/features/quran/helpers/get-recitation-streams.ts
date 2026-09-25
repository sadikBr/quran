import type { Reciter } from "../types";

interface RecitationLocation {
    surahNumber: number;
    ayahNumber?: number;
    globalAyahNumber?: number;
}

function replaceNumberPlaceholder(
    template: string,
    key: "surah" | "ayah",
    value: number,
) {
    const pattern = new RegExp(`\\{${key}(?::0?(\\d+)d)?\\}`, "g");

    return template.replace(
        pattern,
        (_placeholder, width: string | undefined) =>
            width ? String(value).padStart(Number(width), "0") : String(value),
    );
}

export default function getRecitationStreams(
    reciter: Reciter,
    { surahNumber, ayahNumber, globalAyahNumber }: RecitationLocation,
): string[] {
    let stream = replaceNumberPlaceholder(reciter.url, "surah", surahNumber);

    if (reciter.scope === "surah") {
        return [stream];
    }

    const audioAyahNumber =
        reciter.host === "islamic_network" ? globalAyahNumber : ayahNumber;

    if (audioAyahNumber === undefined) return [];

    stream = replaceNumberPlaceholder(stream, "ayah", audioAyahNumber);
    return [stream];
}
