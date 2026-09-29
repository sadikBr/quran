import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createTranslator } from "next-intl";
import PageBackground from "@/components/page-background";
import StickyAppHeader from "@/components/sticky-app-header";
import { auth } from "@/features/auth/auth";
import QuranAudioProvider from "@/features/quran/components/quran-audio-provider";
import getQuranNavigationMeta from "@/features/quran/server/get-quran-navigation-meta";
import getSurahsMeta from "@/features/quran/server/get-surahs-meta";
import { getWarshChapters } from "@/features/quran/server/get-warsh-mushaf";
import SavedAyahsSection from "@/features/saved-ayahs/components/saved-ayahs-section";
import getBookmarkCollections from "@/features/saved-ayahs/server/get-bookmark-collections";
import getSavedAyahs from "@/features/saved-ayahs/server/get-saved-ayahs";
import getPreferences from "@/features/settings/server/get-preferences";
import { getMessages, getTextDirection } from "@/i18n/config";
import { cn } from "@/lib/utils";

export default async function BookmarksPage() {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) redirect("/sign-in");
    const [
        preferences,
        savedAyahs,
        bookmarkCollections,
        surahs,
        hafsNavigation,
    ] = await Promise.all([
        getPreferences(),
        getSavedAyahs(session.user.id),
        getBookmarkCollections(session.user.id),
        getSurahsMeta(),
        getQuranNavigationMeta(),
    ]);
    const warshChapters =
        preferences.riwayah === "warsh" ? await getWarshChapters() : [];
    const warshBySurah = new Map(
        warshChapters.map((chapter) => [chapter.id, chapter]),
    );
    const surahOffsets = new Map<number, number>();
    let ayahOffset = 0;
    for (const surah of surahs) {
        surahOffsets.set(surah.number, ayahOffset);
        ayahOffset += surah.numberOfAyahs;
    }
    const hafsPageForAyah = (
        globalAyahNumber: number,
        fallbackPageNumber: number,
    ) => {
        if (!hafsNavigation) return fallbackPageNumber;

        let pageNumber = 1;

        for (const page of hafsNavigation.pages) {
            if (page.globalAyahNumber > globalAyahNumber) break;
            pageNumber = page.number;
        }

        return pageNumber;
    };
    const localizedSavedAyahs = savedAyahs.map((ayah) => {
        const surah = surahs.find((item) => item.number === ayah.surahNumber);
        const hafsAyahNumber =
            ayah.globalAyahNumber - (surahOffsets.get(ayah.surahNumber) ?? 0);
        const warshChapter = warshBySurah.get(ayah.surahNumber);
        const exactWarshVerse = warshChapter?.verses.find(
            (verse) =>
                verse.number === ayah.ayahNumber &&
                verse.number_in_hafs.includes(hafsAyahNumber),
        );
        const warshVerse =
            exactWarshVerse ??
            warshChapter?.verses.find((verse) =>
                verse.number_in_hafs.includes(hafsAyahNumber),
            );

        return {
            ...ayah,
            ayahNumber: warshVerse?.number ?? hafsAyahNumber,
            pageNumber:
                warshVerse?.page_number ??
                hafsPageForAyah(ayah.globalAyahNumber, ayah.pageNumber),
            arabicText: warshVerse?.text ?? ayah.arabicText,
            surahName:
                preferences.language === "ar"
                    ? (surah?.name ?? ayah.surahName)
                    : (surah?.englishName ?? ayah.surahName),
        };
    });

    const messages = await getMessages(preferences.language);
    const t = createTranslator({
        locale: preferences.language,
        messages,
        namespace: "Dashboard.saved",
    });

    return (
        <main
            lang={preferences.language}
            dir={getTextDirection(preferences.language)}
            className={cn(
                "relative isolate min-h-dvh bg-background",
                preferences.language === "ar" && "arabic-ui",
            )}
        >
            <PageBackground />
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
                <StickyAppHeader navigation />
                <section className="pb-12 pt-5 sm:pt-8">
                    <h1 className="text-3xl font-semibold sm:text-4xl">
                        {t("title")}
                    </h1>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">
                        {t("description")}
                    </p>
                    <QuranAudioProvider>
                        <SavedAyahsSection
                            savedAyahs={localizedSavedAyahs}
                            collections={bookmarkCollections}
                            readingMode={preferences.readingMode}
                        />
                    </QuranAudioProvider>
                </section>
            </div>
        </main>
    );
}
