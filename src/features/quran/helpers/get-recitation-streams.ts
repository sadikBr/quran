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
    { surahNumber, ayahNumber }: RecitationLocation,
): string[] {
    if (
        reciter.availableSurahs &&
        !reciter.availableSurahs.includes(surahNumber)
    )
        return [];
    // A presentation-only basmala has no numbered Quranpedia verse file.
    if (
        reciter.host === "quranpedia" &&
        reciter.scope === "ayah" &&
        (!ayahNumber || ayahNumber < 1)
    )
        return [];
    let stream = replaceNumberPlaceholder(reciter.url, "surah", surahNumber);

    if (reciter.scope === "surah") {
        return [stream];
    }

    if (ayahNumber === undefined) return [];

    stream = replaceNumberPlaceholder(stream, "ayah", ayahNumber);
    return [stream];
}
