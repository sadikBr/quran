import type { ReactNode } from "react";
import QuranHeader from "@/features/quran/components/quran-header";
import getReadingProgress from "@/features/reading-progress/server/get-reading-progress";
import getPreferences from "@/features/settings/server/get-preferences";

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
        <div className="flex h-full min-h-0 flex-col">
            <QuranHeader
                startReadingHref={startReadingHref}
                startReadingLabel={
                    hasSavedProgress ? "Continue reading" : "Start reading"
                }
            />
            <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
        </div>
    );
}
