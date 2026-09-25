import type { AyahType, WarshChapter, WarshVerse } from "../types";

const WARSH_FATIHA_BASMALA = "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ";

export function getWarshHafsAnchor(verse: WarshVerse, surahNumber: number) {
    // Warsh does not count Al-Faatiha's basmala as its first ayah. Its first
    // textual ayah therefore anchors to Hafs ayah 2 even though the source
    // reports the complete [1, 2] correspondence.
    if (surahNumber === 1 && verse.id === 1) return 2;
    return verse.number_in_hafs[0];
}

export default function mapWarshAyahs(
    hafsAyahs: AyahType[],
    chapter: WarshChapter,
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
                audioNumber: chapter.id * 1_000 + verse.id,
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
            isBasmalaSentinel: true,
            text: WARSH_FATIHA_BASMALA,
        },
        ...mappedAyahs,
    ];
}
