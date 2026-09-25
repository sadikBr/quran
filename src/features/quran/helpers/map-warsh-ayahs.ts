import type { AyahType, Reciter, WarshChapter, WarshVerse } from "../types";

const WARSH_FATIHA_BASMALA = "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ";

const NATIVE_WARSH_AYAH_RECITERS = new Set([
    "everyayah/warsh/warsh_yassin_al_jazaery_64kbps",
]);

export function usesNativeWarshAyahNumbering(reciter?: Reciter) {
    return (
        reciter?.scope === "ayah" && NATIVE_WARSH_AYAH_RECITERS.has(reciter.id)
    );
}

export function getWarshHafsAnchor(verse: WarshVerse, surahNumber: number) {
    // Warsh does not count Al-Faatiha's basmala as its first ayah. Its first
    // textual ayah therefore anchors to Hafs ayah 2 even though the source
    // reports the complete [1, 2] correspondence.
    if (surahNumber === 1 && verse.id === 1) return 2;
    return verse.number_in_hafs[0];
}

export function getWarshPlaybackNumber(verse: WarshVerse, surahNumber: number) {
    return surahNumber * 1_000 + getWarshHafsAnchor(verse, surahNumber);
}

export function getNativeWarshPlaybackNumber(
    verse: WarshVerse,
    surahNumber: number,
) {
    return surahNumber * 1_000 + verse.id;
}

export function getWarshPlaybackNumberForHafs(
    chapter: WarshChapter,
    hafsAyahNumber: number,
) {
    if (chapter.id === 1 && hafsAyahNumber === 1) {
        return chapter.id * 1_000;
    }

    const verse = chapter.verses.find((item) =>
        item.number_in_hafs.includes(hafsAyahNumber),
    );

    return verse ? getWarshPlaybackNumber(verse, chapter.id) : null;
}

export function getWarshAudioAyahNumbers(
    verse: WarshVerse,
    surahNumber: number,
) {
    if (surahNumber === 1 && verse.id === 1) return [2];
    return verse.number_in_hafs;
}

export default function mapWarshAyahs(
    hafsAyahs: AyahType[],
    chapter: WarshChapter,
    nativeAudioNumbering = false,
): AyahType[] {
    const hafsByNumber = new Map(
        hafsAyahs.map((ayah) => [ayah.numberInSurah, ayah]),
    );
    const mappedAyahs = chapter.verses.flatMap((verse) => {
        const anchor = getWarshHafsAnchor(verse, chapter.id);
        const hafsAyah = hafsByNumber.get(anchor);

        if (!hafsAyah) return [];

        return [
            {
                ...hafsAyah,
                audioNumber: nativeAudioNumbering
                    ? getNativeWarshPlaybackNumber(verse, chapter.id)
                    : getWarshPlaybackNumber(verse, chapter.id),
                numberInSurah: verse.id,
                text: verse.text,
            },
        ];
    });

    const basmala = hafsByNumber.get(1);

    if (chapter.id !== 1 || !basmala) return mappedAyahs;

    // Surah renders Al-Faatiha's first item as the standalone basmala. Keep a
    // Basmala sentinel solely for that presentation behavior. Its text is
    // independent of the saved Hafs edition, which may contain Tajweed tags.
    return [
        {
            ...basmala,
            audioNumber: chapter.id * 1_000,
            isBasmalaSentinel: true,
            text: WARSH_FATIHA_BASMALA,
        },
        ...mappedAyahs,
    ];
}
