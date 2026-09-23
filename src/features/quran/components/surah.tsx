import type { AyahType, Edition, SurahType } from "../types";
import Ayah from "./ayah";
import SurahFrame from "./surah-frame";

export default function Surah({
    surah,
    ayahs,
    translatedAyahs,
    showTranslation,
    translationEdition,
}: {
    surah: SurahType;
    ayahs: AyahType[];
    translatedAyahs: AyahType[];
    showTranslation: boolean;
    translationEdition?: Edition;
}) {
    return (
        <>
            <div className="rtl">
                {ayahs[0].numberInSurah === 1 && (
                    <SurahFrame surah={surah} activateLink={false} />
                )}
                <div
                    dir="rtl"
                    lang="ar"
                    className="mt-5 border-y border-primary/15 py-5 text-center leading-[2.5] sm:py-7 sm:leading-[2.7]"
                >
                    {ayahs.map((ayah) => {
                        return <Ayah key={ayah.number} ayah={ayah} />;
                    })}
                </div>
            </div>
            {showTranslation && (
                <section
                    aria-labelledby={`translation-${surah.number}`}
                    className="ltr mt-8 mb-10 rounded-xl border bg-card/70 p-5 shadow-sm sm:p-6"
                >
                    <div className="flex items-baseline justify-between gap-4 border-b pb-4">
                        <h2
                            id={`translation-${surah.number}`}
                            className="text-sm font-semibold tracking-wide text-card-foreground"
                        >
                            English translation
                        </h2>
                        <p className="text-xs text-muted-foreground">
                            {translationEdition?.englishName ??
                                translationEdition?.name ??
                                "Translation"}
                        </p>
                    </div>
                    <div className="mt-5 space-y-3 text-base leading-8 text-card-foreground/90 sm:text-[1.05rem]">
                        {translatedAyahs.map((ayah) => (
                            <p key={ayah.number} className="relative pl-8">
                                <span className="absolute left-0 top-1 text-xs font-semibold text-primary">
                                    {ayah.numberInSurah}
                                </span>
                                {ayah.text}
                            </p>
                        ))}
                    </div>
                </section>
            )}
        </>
    );
}
