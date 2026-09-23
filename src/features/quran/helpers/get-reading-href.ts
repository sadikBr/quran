import type { Preferences } from "@/features/settings/preferences";
import getSurahStartingPage from "./get-surah-starting-page";

export default function getReadingHref(
    surahNumber: number,
    preferences: Preferences,
): string {
    if (preferences.readingMode === "page") {
        const page = getSurahStartingPage(surahNumber);
        return `/quran/page/${page}`;
    }

    return `/quran/surah/${surahNumber}`;
}
