import type { AyahType, Reciter, WarshChapter, WarshVerse } from "../types";

const WARSH_FATIHA_BASMALA = "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ";

export function usesNativeWarshAyahNumbering(reciter?: Reciter) {
    return (
        reciter?.scope === "ayah" &&
        reciter.host === "quranpedia" &&
        reciter.recitation === "warsh"
    );
}

export function getWarshHafsAnchor(verse: WarshVerse, surahNumber: number) {
    // Warsh does not count Al-Faatiha's basmala as its first ayah. Its first
    // textual ayah therefore anchors to Hafs ayah 2 even though the source
    // reports the complete [1, 2] correspondence.
    if (surahNumber === 1 && verse.number === 1) return 2;
    return verse.number_in_hafs[0];
}

export function getWarshPlaybackNumber(verse: WarshVerse, surahNumber: number) {
    return surahNumber * 1_000 + getWarshHafsAnchor(verse, surahNumber);
}

export function getNativeWarshPlaybackNumber(
    verse: WarshVerse,
    surahNumber: number,
) {
    return surahNumber * 1_000 + verse.number;
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
    if (surahNumber === 1 && verse.number === 1) return [2];
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
    const claimedLegacyAnchors = new Set<number>();
    const mappedAyahs = chapter.verses.flatMap((verse) => {
        const anchor = getWarshHafsAnchor(verse, chapter.id);
        const hafsAyah = hafsByNumber.get(anchor);

        if (!hafsAyah) return [];

        const hafsGlobalNumbers = getWarshAudioAyahNumbers(
            verse,
            chapter.id,
        ).flatMap((number) => {
            const mapped = hafsByNumber.get(number);
            return mapped ? [mapped.number] : [];
        });

        const legacyAnchorNumber = claimedLegacyAnchors.has(hafsAyah.number)
            ? undefined
            : hafsAyah.number;
        claimedLegacyAnchors.add(hafsAyah.number);

        return [
            {
                ...hafsAyah,
                number: verse.id,
                hafsGlobalNumber: hafsAyah.number,
                hafsGlobalNumbers,
                legacyAnchorNumber,
                audioNumber: nativeAudioNumbering
                    ? getNativeWarshPlaybackNumber(verse, chapter.id)
                    : getWarshPlaybackNumber(verse, chapter.id),
                numberInSurah: verse.number,
                text: verse.text,
                juz: verse.juz,
                manzil: verse.manzil,
                page: verse.page_number,
                ruku: verse.ruku,
                hizbQuarter: verse.hizb,
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
            hafsGlobalNumber: basmala.number,
            hafsGlobalNumbers: [basmala.number],
            audioNumber: chapter.id * 1_000,
            isBasmalaSentinel: true,
            text: WARSH_FATIHA_BASMALA,
        },
        ...mappedAyahs,
    ];
}
