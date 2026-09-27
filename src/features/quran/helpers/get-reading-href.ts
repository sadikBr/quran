import type { Preferences } from "@/features/settings/preferences";
import getSurahStartingPage from "./get-surah-starting-page";

export default function getReadingHref(
    surahNumber: number,
    preferences: Preferences,
    startingPage?: number,
): string {
    if (preferences.readingMode === "page") {
        const page = startingPage ?? getSurahStartingPage(surahNumber);
        return `/quran/page/${page}`;
    }

    return `/quran/surah/${surahNumber}`;
}
