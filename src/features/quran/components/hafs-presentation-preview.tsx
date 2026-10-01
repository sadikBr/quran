export default function HafsPresentationPreview({
    edition,
    label,
}: {
    edition: string;
    label: string;
}) {
    const isVerseView = edition === "quranpedia.mushaf.2";
    const verses = isVerseView
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
                            {text}{" "}
                            <span className="frame text-primary">
                                {index === 0 ? "٢" : "٣"}
                            </span>{" "}
                        </span>
                    ))}
                </div>
            </div>
        </figure>
    );
}
