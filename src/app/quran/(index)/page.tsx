import QuranIndex from "@/features/quran/components/quran-index";
import getQuranNavigationMeta from "@/features/quran/server/get-quran-navigation-meta";
import getSurahsMeta from "@/features/quran/server/get-surahs-meta";
import {
    getWarshChapters,
    getWarshNavigationMeta,
} from "@/features/quran/server/get-warsh-mushaf";
import getPreferences from "@/features/settings/server/get-preferences";

export default async function IndexPage() {
    const preferences = await getPreferences();
    const [surahs, navigation, warshChapters] = await Promise.all([
        getSurahsMeta(),
        preferences.riwayah === "warsh"
            ? getWarshNavigationMeta()
            : getQuranNavigationMeta(),
        preferences.riwayah === "warsh"
            ? getWarshChapters()
            : Promise.resolve([]),
    ]);
    const warshBySurah = new Map(
        warshChapters.map((chapter) => [chapter.id, chapter]),
    );
    const displayedSurahs = surahs.map((surah) => {
        const chapter = warshBySurah.get(surah.number);
        return chapter
            ? { ...surah, numberOfAyahs: chapter.verses.length }
            : surah;
    });
    const surahStartingPages = Object.fromEntries(
        warshChapters.map((chapter) => [
            chapter.id,
            chapter.verses[0]?.page_number ?? 1,
        ]),
    );

    return (
        <QuranIndex
            surahs={displayedSurahs}
            navigation={navigation}
            surahStartingPages={surahStartingPages}
        />
    );
}
