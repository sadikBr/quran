import sample from "../data/tajweed-preview.json";
import warshSample from "../data/warsh-tajweed/preview.json";
import type { TajweedSegment } from "../helpers/quranpedia-tajweed";
import QuranText from "./quran-text";

export default function HafsPresentationPreview({
    edition,
    label,
    warsh = false,
    warshTajweed = false,
}: {
    edition: string;
    label: string;
    warsh?: boolean;
    warshTajweed?: boolean;
}) {
    const isVerseView = !warsh && edition === "quranpedia.mushaf.2";
    const isTajweed = warsh ? warshTajweed : edition === "quranpedia.mushaf.11";
    const verses = warsh
        ? warshSample.map((verse) => verse.text)
        : isVerseView || isTajweed
          ? ["ٱلۡحَمۡدُ لِلَّهِ رَبِّ ٱلۡعَٰلَمِينَ", "ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ"]
          : ["الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ", "الرَّحْمَٰنِ الرَّحِيمِ"];

    return (
        <figure className="mt-4 min-w-0">
            <figcaption className="text-xs text-muted-foreground">
                {label}
            </figcaption>
            <div
                className="quran-reading-surface"
                data-riwayah={warsh ? "warsh" : "hafs"}
                data-presentation={isVerseView ? "verses" : "mushaf"}
                dir="rtl"
                lang="ar"
            >
                <div className="quran-reading-flow text-center text-2xl">
                    {verses.map((text, index) => (
                        <span
                            className="ayah me-2"
                            data-arabic-edition={
                                warsh ? "quranpedia.mushaf.4" : edition
                            }
                            key={text}
                        >
                            <QuranText
                                text={text}
                                tajweed={
                                    isTajweed
                                        ? ((warsh
                                              ? warshSample[index].tajweed
                                              : sample[
                                                    index
                                                ]) as TajweedSegment[])
                                        : undefined
                                }
                            />{" "}
                            <span className="frame text-primary">
                                {warsh
                                    ? index === 0
                                        ? "١"
                                        : "٢"
                                    : index === 0
                                      ? "٢"
                                      : "٣"}
                            </span>{" "}
                        </span>
                    ))}
                </div>
            </div>
        </figure>
    );
}
