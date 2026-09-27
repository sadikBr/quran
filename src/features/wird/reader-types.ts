import type { AyahType, Edition, SurahType } from "@/features/quran/types";

export interface WirdReaderGroup {
    surah: SurahType;
    ayahs: AyahType[];
    translatedAyahs: AyahType[];
    translationEdition?: Edition;
}
