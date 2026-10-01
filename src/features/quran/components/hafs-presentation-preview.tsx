import sample from "../data/tajweed-preview.json";
import type { TajweedSegment } from "../helpers/quranpedia-tajweed";
import QuranText from "./quran-text";
import TajweedKey from "./tajweed-key";

export default function HafsPresentationPreview({
    edition,
    label,
}: {
    edition: string;
    label: string;
}) {
    const isVerseView = edition === "quranpedia.mushaf.2";
    const isTajweed = edition === "quranpedia.mushaf.11";
    const verses =
        isVerseView || isTajweed
            ? ["ٱلۡحَمۡدُ لِلَّهِ رَبِّ ٱلۡعَٰلَمِينَ", "ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ"]
            : ["الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ", "الرَّحْمَٰنِ الرَّحِيمِ"];

    return (
        <figure className="mt-4 min-w-0">
            <figcaption className="text-xs text-muted-foreground">
                {label}
            </figcaption>
            <div
                className="quran-reading-surface"
                data-presentation={isVerseView ? "verses" : "mushaf"}
                dir="rtl"
                lang="ar"
            >
                <div className="quran-reading-flow text-center text-2xl">
                    {verses.map((text, index) => (
                        <span
                            className="ayah me-2"
                            data-arabic-edition={edition}
                            key={text}
                        >
                            <QuranText
                                text={text}
                                tajweed={
                                    isTajweed
                                        ? (sample[index] as TajweedSegment[])
                                        : undefined
                                }
                            />{" "}
                            <span className="frame text-primary">
                                {index === 0 ? "٢" : "٣"}
                            </span>{" "}
                        </span>
                    ))}
                </div>
            </div>
            {isTajweed && <TajweedKey />}
        </figure>
    );
}
