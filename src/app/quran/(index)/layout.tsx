import type { ReactNode } from "react";
import QuranHeader from "@/features/quran/components/quran-header";
import getReadingProgress from "@/features/reading-progress/server/get-reading-progress";
import getPreferences from "@/features/settings/server/get-preferences";
import { getTextDirection } from "@/i18n/config";
import { cn } from "@/lib/utils";

export default async function QuranIndexLayout({
    children,
}: {
    children: ReactNode;
}) {
    const [preferences, readingProgress] = await Promise.all([
        getPreferences(),
        getReadingProgress(),
    ]);
    const savedNumber =
        preferences.readingMode === "page"
            ? readingProgress.lastPageNumber
            : readingProgress.lastSurahNumber;
    const hasSavedProgress = savedNumber !== null;
    const startReadingHref = `/quran/${preferences.readingMode}/${savedNumber ?? 1}`;

    return (
        <div
            lang={preferences.language}
            dir={getTextDirection(preferences.language)}
            className={cn(
                "flex h-full min-h-0 flex-col",
                preferences.language === "ar" && "arabic-ui",
            )}
        >
            <QuranHeader
                startReadingHref={startReadingHref}
                hasSavedProgress={hasSavedProgress}
            />
            <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
        </div>
    );
}
