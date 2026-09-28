import type { AyahType, Edition, SurahType } from "@/features/quran/types";

export interface PracticeReaderGroup {
    surah: SurahType;
    ayahs: AyahType[];
    translatedAyahs: AyahType[];
    translationEdition?: Edition;
}
