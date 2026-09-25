import { stripBasmalaPrefix } from "../helpers/basmala";
import type { AyahType, Edition, SurahType } from "../types";
import Ayah from "./ayah";
import SurahBasmala from "./surah-basmala";
import SurahFrame from "./surah-frame";
import TranslationAyah from "./translation-ayah";

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
    const beginsAtSurahStart = ayahs[0]?.numberInSurah === 1;
    const hasUnnumberedFatihaBasmala =
        beginsAtSurahStart &&
        surah.number === 1 &&
        ayahs[0]?.isBasmalaSentinel === true;
    const fatihaAyah =
        beginsAtSurahStart && surah.number === 1 && !hasUnnumberedFatihaBasmala
            ? ayahs[0]
            : undefined;
    const readingAyahs = hasUnnumberedFatihaBasmala
        ? ayahs.slice(1)
        : fatihaAyah
          ? ayahs.slice(1)
          : ayahs.map((ayah, index) =>
                beginsAtSurahStart && index === 0
                    ? { ...ayah, text: stripBasmalaPrefix(ayah.text) }
                    : ayah,
            );

    return (
        <>
            <div className="rtl">
                {beginsAtSurahStart && <SurahFrame surah={surah} />}
                {beginsAtSurahStart && (
                    <SurahBasmala
                        surahNumber={surah.number}
                        fatihaAyah={fatihaAyah}
                    />
                )}
                <div
                    dir="rtl"
                    lang="ar"
                    className="mt-0 py-2 text-justify leading-[2.5] sm:py-3 sm:leading-[2.7]"
                    style={{ textAlignLast: "center" }}
                >
                    {readingAyahs.map((ayah) => {
                        return (
                            <Ayah
                                key={`${ayah.number}-${ayah.numberInSurah}`}
                                ayah={ayah}
                                surahNumber={surah.number}
                            />
                        );
                    })}
                </div>
            </div>
            {showTranslation && (
                <section
                    aria-labelledby={`translation-${surah.number}`}
                    className="ltr mt-8 mb-10"
                >
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <p className="text-[0.65rem] font-semibold tracking-[0.18em] text-primary uppercase">
                                Translation
                            </p>
                            <h2
                                id={`translation-${surah.number}`}
                                className="mt-1 text-lg font-semibold tracking-tight text-foreground"
                            >
                                English translation
                            </h2>
                        </div>
                        <p className="rounded-full bg-muted/55 px-3 py-1.5 text-xs text-muted-foreground">
                            {translationEdition?.englishName ??
                                translationEdition?.name ??
                                "Translation"}
                        </p>
                    </div>
                    <div className="mt-5 space-y-1 text-[0.95rem] leading-7 text-foreground/85 sm:text-base sm:leading-8">
                        {translatedAyahs.map((ayah) => (
                            <TranslationAyah key={ayah.number} ayah={ayah} />
                        ))}
                    </div>
                </section>
            )}
        </>
    );
}
