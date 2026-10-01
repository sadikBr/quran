import type { Preferences } from "@/features/settings/preferences";

export default function getReadingHref(
    surahNumber: number,
    preferences: Preferences,
    startingPage?: number,
): string {
    if (preferences.readingMode === "page" && startingPage !== undefined) {
        return `/quran/page/${startingPage}`;
    }

    return `/quran/surah/${surahNumber}`;
}
